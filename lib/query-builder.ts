/**
 * ObjectQL Filter AST — query builder types and helpers.
 *
 * ObjectQL represents filters as a compact array-based AST:
 *   - Simple filter:   ['field', 'op', 'value']
 *   - Compound filter:  ['AND', ...filters] or ['OR', ...filters]
 *
 * This module provides typed helpers for building, validating, and
 * serializing these filter expressions.
 */

/* ------------------------------------------------------------------ */
/*  Filter operators                                                    */
/* ------------------------------------------------------------------ */

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "between";

export type CompoundOperator = "AND" | "OR";

export interface OperatorMeta {
  label: string;
  /** Number of value inputs the operator needs (0 for is_null, 2 for between) */
  valueCount: 0 | 1 | 2;
}

export const OPERATOR_META: Record<FilterOperator, OperatorMeta> = {
  eq: { label: "equals", valueCount: 1 },
  neq: { label: "not equals", valueCount: 1 },
  gt: { label: "greater than", valueCount: 1 },
  gte: { label: "greater or equal", valueCount: 1 },
  lt: { label: "less than", valueCount: 1 },
  lte: { label: "less or equal", valueCount: 1 },
  contains: { label: "contains", valueCount: 1 },
  not_contains: { label: "does not contain", valueCount: 1 },
  starts_with: { label: "starts with", valueCount: 1 },
  ends_with: { label: "ends with", valueCount: 1 },
  in: { label: "is any of", valueCount: 1 },
  not_in: { label: "is none of", valueCount: 1 },
  is_null: { label: "is empty", valueCount: 0 },
  is_not_null: { label: "is not empty", valueCount: 0 },
  between: { label: "is between", valueCount: 2 },
};

/**
 * Returns the operators that are valid for a given field type.
 */
export function operatorsForFieldType(
  fieldType: string,
): FilterOperator[] {
  const common: FilterOperator[] = ["eq", "neq", "is_null", "is_not_null"];

  switch (fieldType) {
    case "text":
    case "textarea":
    case "email":
    case "url":
    case "phone":
    case "markdown":
    case "richtext":
      return [...common, "contains", "not_contains", "starts_with", "ends_with", "in", "not_in"];

    case "number":
    case "currency":
    case "percent":
    case "rating":
    case "slider":
      return [...common, "gt", "gte", "lt", "lte", "between", "in", "not_in"];

    case "date":
    case "datetime":
    case "time":
      return [...common, "gt", "gte", "lt", "lte", "between"];

    case "boolean":
    case "toggle":
      return ["eq", "neq", "is_null", "is_not_null"];

    case "select":
    case "radio":
      return [...common, "in", "not_in"];

    case "multiselect":
    case "checkboxes":
    case "tags":
      return [...common, "contains", "not_contains"];

    case "lookup":
    case "master_detail":
      return [...common, "in", "not_in"];

    default:
      return common;
  }
}

/* ------------------------------------------------------------------ */
/*  Filter AST types                                                    */
/* ------------------------------------------------------------------ */

/** A single field-level filter condition */
export interface SimpleFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  /** Second value for "between" operator */
  value2?: unknown;
}

/** A compound AND/OR group of filters */
export interface CompoundFilter {
  id: string;
  logic: CompoundOperator;
  filters: FilterNode[];
}

/** A node in the filter tree — either simple or compound */
export type FilterNode = SimpleFilter | CompoundFilter;

/* ------------------------------------------------------------------ */
/*  Type guards                                                         */
/* ------------------------------------------------------------------ */

export function isCompoundFilter(node: FilterNode): node is CompoundFilter {
  return "logic" in node && "filters" in node;
}

export function isSimpleFilter(node: FilterNode): node is SimpleFilter {
  return "field" in node && "operator" in node;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

let _nextId = 1;

/** Generate a unique filter node ID */
export function genFilterId(): string {
  return `filter_${_nextId++}_${Date.now()}`;
}

/** Create a blank simple filter */
export function createSimpleFilter(field = "", operator: FilterOperator = "eq"): SimpleFilter {
  return { id: genFilterId(), field, operator, value: "" };
}

/** Create a compound filter group */
export function createCompoundFilter(
  logic: CompoundOperator = "AND",
  filters: FilterNode[] = [],
): CompoundFilter {
  return { id: genFilterId(), logic, filters };
}

/* ------------------------------------------------------------------ */
/*  Serialisation — local AST → ObjectQL wire format                    */
/* ------------------------------------------------------------------ */

/**
 * Convert a FilterNode tree into the ObjectQL array-based AST
 * that the server expects.
 *
 * Simple:    ['field', 'op', value]
 * Compound:  ['AND', filter1, filter2, …]
 */
export function serializeFilter(node: FilterNode): unknown {
  if (isCompoundFilter(node)) {
    const children = node.filters
      .map(serializeFilter)
      .filter(Boolean);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    return [node.logic, ...children];
  }

  // Simple filter
  const { field, operator, value, value2 } = node;
  if (!field) return null;

  const meta = OPERATOR_META[operator];
  if (meta.valueCount === 0) {
    return [field, operator];
  }
  if (meta.valueCount === 2) {
    return [field, operator, value, value2];
  }
  return [field, operator, value];
}

/**
 * Serialize a filter tree into a flat ObjectQL filter, or null if empty.
 */
export function serializeFilterTree(root: CompoundFilter): unknown | null {
  const result = serializeFilter(root);
  return result ?? null;
}

/* ------------------------------------------------------------------ */
/*  Field selection / projections                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a field selection (projection) array from a list of field names.
 * When empty, all fields are returned (no projection).
 */
export function buildProjection(selectedFields: string[]): string[] | undefined {
  return selectedFields.length > 0 ? selectedFields : undefined;
}
