import { useCallback, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface HighlightField {
  id: string;
  fieldName: string;
  label: string;
  value: unknown;
  format?: string;
}

export interface RecordHighlightsProps {
  highlights?: HighlightField[];
  maxVisible?: number;
}

export interface UseRecordHighlightsResult {
  /** All highlight fields */
  highlights: HighlightField[];
  /** Maximum number of visible highlights */
  maxVisible: number;
  /** Visible highlights (capped by maxVisible) */
  visibleHighlights: HighlightField[];
  /** Set all highlight fields */
  setHighlights: (highlights: HighlightField[]) => void;
  /** Add a highlight field */
  addHighlight: (highlight: HighlightField) => void;
  /** Remove a highlight field by id */
  removeHighlight: (id: string) => void;
  /** Reorder highlights by providing an ordered array of ids */
  reorderHighlights: (orderedIds: string[]) => void;
  /** Set the maximum visible count */
  setMaxVisible: (max: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing highlight fields panel on SDUI record pages —
 * add, remove, reorder, and cap visible count.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { highlights, visibleHighlights, addHighlight, reorderHighlights } =
 *   useRecordHighlights();
 * addHighlight({ id: "h1", fieldName: "revenue", label: "Revenue", value: 50000 });
 * reorderHighlights(["h2", "h1"]);
 * ```
 */
export function useRecordHighlights(
  _props?: RecordHighlightsProps,
): UseRecordHighlightsResult {
  const [highlights, setHighlightsState] = useState<HighlightField[]>([]);
  const [maxVisible, setMaxVisibleState] = useState<number>(5);

  const visibleHighlights = useMemo(
    () => highlights.slice(0, maxVisible),
    [highlights, maxVisible],
  );

  const setHighlights = useCallback((items: HighlightField[]) => {
    setHighlightsState(items);
  }, []);

  const addHighlight = useCallback((highlight: HighlightField) => {
    setHighlightsState((prev) => [...prev, highlight]);
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setHighlightsState((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const reorderHighlights = useCallback((orderedIds: string[]) => {
    setHighlightsState((prev) => {
      const map = new Map(prev.map((h) => [h.id, h]));
      const reordered: HighlightField[] = [];
      for (const id of orderedIds) {
        const item = map.get(id);
        if (item) reordered.push(item);
      }
      // Append any items not in the orderedIds list
      for (const h of prev) {
        if (!orderedIds.includes(h.id)) reordered.push(h);
      }
      return reordered;
    });
  }, []);

  const setMaxVisible = useCallback((max: number) => {
    setMaxVisibleState(max);
  }, []);

  return {
    highlights,
    maxVisible,
    visibleHighlights,
    setHighlights,
    addHighlight,
    removeHighlight,
    reorderHighlights,
    setMaxVisible,
  };
}
