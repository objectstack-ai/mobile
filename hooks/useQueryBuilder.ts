import { useCallback, useState } from "react";
import {
  type FilterNode,
  type CompoundFilter,
  type SimpleFilter,
  type FilterOperator,
  type CompoundOperator,
  createSimpleFilter,
  createCompoundFilter,
  serializeFilterTree,
  buildProjection,
  isCompoundFilter,
} from "~/lib/query-builder";

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for building and managing ObjectQL filter trees.
 *
 * Maintains a root compound filter that users can compose through
 * the query-builder UI, plus field selection for projections.
 */
export function useQueryBuilder() {
  const [root, setRoot] = useState<CompoundFilter>(
    createCompoundFilter("AND"),
  );
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");

  /* ---- tree manipulation ---- */

  /** Add a blank filter to the root group */
  const addFilter = useCallback((field = "", operator: FilterOperator = "eq") => {
    setRoot((prev) => ({
      ...prev,
      filters: [...prev.filters, createSimpleFilter(field, operator)],
    }));
  }, []);

  /** Add a nested compound group (AND/OR) */
  const addGroup = useCallback((logic: CompoundOperator = "AND") => {
    setRoot((prev) => ({
      ...prev,
      filters: [...prev.filters, createCompoundFilter(logic)],
    }));
  }, []);

  /** Update a filter node by id anywhere in the tree */
  const updateFilter = useCallback(
    (id: string, patch: Partial<SimpleFilter>) => {
      setRoot((prev) => patchNode(prev, id, patch) as CompoundFilter);
    },
    [],
  );

  /** Remove a filter node by id */
  const removeFilter = useCallback((id: string) => {
    setRoot((prev) => removeNode(prev, id) as CompoundFilter);
  }, []);

  /** Toggle root logic (AND ↔ OR) */
  const toggleRootLogic = useCallback(() => {
    setRoot((prev) => ({
      ...prev,
      logic: prev.logic === "AND" ? "OR" : "AND",
    }));
  }, []);

  /** Reset all filters */
  const clearFilters = useCallback(() => {
    setRoot(createCompoundFilter("AND"));
    setGlobalSearch("");
  }, []);

  /* ---- serialisation ---- */

  /** Serialize the current filter tree to ObjectQL wire format */
  const serialize = useCallback(() => {
    return serializeFilterTree(root);
  }, [root]);

  /** Get the projection array */
  const projection = buildProjection(selectedFields);

  return {
    root,
    setRoot,
    globalSearch,
    setGlobalSearch,
    selectedFields,
    setSelectedFields,
    addFilter,
    addGroup,
    updateFilter,
    removeFilter,
    toggleRootLogic,
    clearFilters,
    serialize,
    projection,
    /** Whether any filters are active */
    hasFilters: root.filters.length > 0 || globalSearch.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal tree helpers                                               */
/* ------------------------------------------------------------------ */

function patchNode(
  node: FilterNode,
  targetId: string,
  patch: Partial<SimpleFilter>,
): FilterNode {
  if (node.id === targetId) {
    return { ...node, ...patch } as FilterNode;
  }
  if (isCompoundFilter(node)) {
    return {
      ...node,
      filters: node.filters.map((child) => patchNode(child, targetId, patch)),
    };
  }
  return node;
}

function removeNode(node: FilterNode, targetId: string): FilterNode {
  if (isCompoundFilter(node)) {
    return {
      ...node,
      filters: node.filters
        .filter((child) => child.id !== targetId)
        .map((child) => removeNode(child, targetId)),
    };
  }
  return node;
}
