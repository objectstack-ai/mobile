import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ListDensity = "compact" | "comfortable" | "spacious";

export interface UseListEnhancementResult {
  /** Current list density */
  density: ListDensity;
  /** Update the list density */
  setDensity: (density: ListDensity) => void;
  /** Total record count (null when unknown) */
  recordCount: number | null;
  /** Update the record count */
  setRecordCount: (count: number | null) => void;
  /** Currently active saved-view tab */
  activeViewTab: string | null;
  /** Switch the active view tab */
  setActiveViewTab: (tabId: string | null) => void;
  /** Row height in dp for the current density */
  getRowHeight: () => number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ROW_HEIGHTS: Record<ListDensity, number> = {
  compact: 48,
  comfortable: 64,
  spacious: 80,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * List view enhancements: record count, density toggle, saved view tabs.
 *
 * Pure local state — no server calls.
 *
 * ```ts
 * const { density, setDensity, getRowHeight } = useListEnhancement();
 * ```
 */
export function useListEnhancement(): UseListEnhancementResult {
  const [density, setDensity] = useState<ListDensity>("comfortable");
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<string | null>(null);

  const getRowHeight = useCallback(
    () => ROW_HEIGHTS[density],
    [density],
  );

  return {
    density,
    setDensity,
    recordCount,
    setRecordCount,
    activeViewTab,
    setActiveViewTab,
    getRowHeight,
  };
}
