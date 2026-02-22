import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface RelatedListConfig {
  id: string;
  objectType: string;
  label: string;
  fields: string[];
  sortField?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export interface RecordRelatedListProps {
  relatedLists?: RelatedListConfig[];
}

export interface UseRecordRelatedListResult {
  /** Related list configurations */
  relatedLists: RelatedListConfig[];
  /** Set of expanded list ids */
  expanded: Set<string>;
  /** Set all related list configurations */
  setRelatedLists: (lists: RelatedListConfig[]) => void;
  /** Toggle expand/collapse for a list */
  toggleExpand: (id: string) => void;
  /** Collapse all lists */
  collapseAll: () => void;
  /** Expand all lists */
  expandAll: () => void;
  /** Check if a list is expanded */
  isExpanded: (id: string) => boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing related record panels on SDUI record pages —
 * expand, collapse, and configure related lists.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { relatedLists, toggleExpand, expandAll, isExpanded } =
 *   useRecordRelatedList();
 * setRelatedLists([{ id: "r1", objectType: "Contact", label: "Contacts", fields: ["name"] }]);
 * toggleExpand("r1");
 * const open = isExpanded("r1");
 * ```
 */
export function useRecordRelatedList(
  _props?: RecordRelatedListProps,
): UseRecordRelatedListResult {
  const [relatedLists, setRelatedListsState] = useState<RelatedListConfig[]>(
    [],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const setRelatedLists = useCallback((lists: RelatedListConfig[]) => {
    setRelatedListsState(lists);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(relatedLists.map((l) => l.id)));
  }, [relatedLists]);

  const isExpanded = useCallback(
    (id: string): boolean => expanded.has(id),
    [expanded],
  );

  return {
    relatedLists,
    expanded,
    setRelatedLists,
    toggleExpand,
    collapseAll,
    expandAll,
    isExpanded,
  };
}
