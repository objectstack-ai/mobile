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
 * Map the builder's internal operator tokens to the vocabulary the data API
 * actually parses. The server understands comparison *symbols* (`=`, `!=`,
 * `>`, …) — NOT word tokens like `eq`/`gt`. Emitting the raw token makes the
 * server silently ignore the condition and return every row (the classic
 * "filter UI changes nothing" bug). Mirrors MONGO_OP_TO_AST so the builder and
 * dashboard paths speak the same dialect.
 */
const AST_OP: Partial<Record<FilterOperator, string>> = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  contains: "contains",
  not_contains: "not_contains",
  starts_with: "starts_with",
  ends_with: "ends_with",
  in: "in",
  not_in: "not_in",
};

/**
 * Convert a FilterNode tree into the ObjectQL array-based AST the server
 * expects.
 *
 * Simple:    ['field', '=', value]
 * Compound:  ['and', filter1, filter2, …]   // lowercase logic, per the API
 *
 * Operators are translated to the API's symbol vocabulary; the tokens with no
 * native server form are rewritten to equivalents the server does accept:
 *   - is_null      → ['field', '=', null]
 *   - is_not_null  → ['field', '!=', null]
 *   - between      → ['and', ['field','>=',a], ['field','<=',b]]
 */
export function serializeFilter(node: FilterNode): unknown {
  if (isCompoundFilter(node)) {
    const children = node.filters
      .map(serializeFilter)
      .filter(Boolean);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    // The API parses a lowercase logic token (matches mongoFilterToAst).
    return [node.logic.toLowerCase(), ...children];
  }

  // Simple filter
  const { field, operator, value, value2 } = node;
  if (!field) return null;

  // Null checks: the API has no `is_null` token — express via (in)equality.
  if (operator === "is_null") return [field, "=", null];
  if (operator === "is_not_null") return [field, "!=", null];

  // Between has no native token — expand to an inclusive AND range.
  if (operator === "between") {
    return ["and", [field, ">=", value], [field, "<=", value2]];
  }

  const astOp = AST_OP[operator] ?? operator;
  return [field, astOp, value];
}

/**
 * Serialize a filter tree into a flat ObjectQL filter, or null if empty.
 */
export function serializeFilterTree(root: CompoundFilter): unknown | null {
  const result = serializeFilter(root);
  return result ?? null;
}

/* ------------------------------------------------------------------ */
/*  Mongo-style filter → ObjectQL array AST                             */
/* ------------------------------------------------------------------ */

/**
 * Dashboard/view metadata authors filters in a compact Mongo-style object
 * (`{ stage: "closed_won", close_date: { $gte: "{last_12_months}" } }`). The
 * data API, however, only honours a filter passed as the array-based ObjectQL
 * AST — `client.data.find` URL-encodes a plain object's *top-level* keys but
 * stringifies any nested operator object to `"[object Object]"`, silently
 * dropping the condition. We therefore translate to the AST the server
 * actually parses, mapping operator tokens to the symbol vocabulary it accepts
 * (`=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`).
 */
const MONGO_OP_TO_AST: Record<string, string> = {
  $eq: "=",
  $ne: "!=",
  $gt: ">",
  $gte: ">=",
  $lt: "<",
  $lte: "<=",
  $in: "in",
  $nin: "not_in",
  $contains: "contains",
  $startsWith: "starts_with",
  $endsWith: "ends_with",
};

const MACRO_RE = /^\{([a-z0-9_]+)\}$/i;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Resolve a relative-date macro token (e.g. `{last_12_months}`, `{today}`,
 * `{current_year_start}`) to an epoch-millisecond bound, matching how the
 * platform stores date/datetime fields. Unknown tokens are returned verbatim.
 */
export function resolveFilterMacro(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const match = MACRO_RE.exec(value);
  if (!match) return value;
  const token = match[1].toLowerCase();
  const now = new Date();
  const y = now.getFullYear();

  let m: RegExpExecArray | null;
  if (token === "today") return startOfDay(now);
  if (token === "now") return now.getTime();
  if (token === "yesterday") return startOfDay(now) - 86_400_000;
  if (token === "tomorrow") return startOfDay(now) + 86_400_000;
  if ((m = /^(?:last_(\d+)_days|(\d+)_days_ago)$/.exec(token))) {
    return now.getTime() - Number(m[1] ?? m[2]) * 86_400_000;
  }
  if ((m = /^(?:last_(\d+)_weeks?|(\d+)_weeks?_ago)$/.exec(token))) {
    return now.getTime() - Number(m[1] ?? m[2]) * 7 * 86_400_000;
  }
  if ((m = /^(?:last_(\d+)_months|(\d+)_months_ago)$/.exec(token))) {
    const months = Number(m[1] ?? m[2]);
    return new Date(y, now.getMonth() - months, now.getDate()).getTime();
  }
  if ((m = /^(?:last_(\d+)_years?|(\d+)_years?_ago)$/.exec(token))) {
    const years = Number(m[1] ?? m[2]);
    return new Date(y - years, now.getMonth(), now.getDate()).getTime();
  }
  if (token === "current_year_start" || token === "this_year_start") {
    return new Date(y, 0, 1).getTime();
  }
  if (token === "current_year_end" || token === "this_year_end") {
    return new Date(y, 11, 31, 23, 59, 59, 999).getTime();
  }
  if (token === "current_week_start" || token === "this_week_start") {
    // Week starts Monday (ISO): shift back to the most recent Monday.
    const dow = (now.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
    return startOfDay(now) - dow * 86_400_000;
  }
  if (token === "current_month_start" || token === "this_month_start") {
    return new Date(y, now.getMonth(), 1).getTime();
  }
  if (token === "current_month_end" || token === "this_month_end") {
    return new Date(y, now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  }
  if (token === "current_quarter_start") {
    return new Date(y, Math.floor(now.getMonth() / 3) * 3, 1).getTime();
  }
  if (token === "current_quarter_end") {
    return new Date(y, Math.floor(now.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999).getTime();
  }
  // Unknown macro — leave as-is so it's visibly inert rather than silently 0.
  return value;
}

function resolveLeaf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(resolveLeaf);
  return resolveFilterMacro(value);
}

/** Build the AST node for a single field's Mongo condition. */
function fieldToAst(field: string, condition: unknown): unknown[] {
  // `{ field: { $gte: x, $lte: y } }` may carry multiple operators → AND them.
  if (
    condition !== null &&
    typeof condition === "object" &&
    !Array.isArray(condition) &&
    Object.keys(condition as object).some((k) => k.startsWith("$"))
  ) {
    const nodes: unknown[] = [];
    for (const [op, raw] of Object.entries(condition as Record<string, unknown>)) {
      const astOp = MONGO_OP_TO_AST[op];
      if (!astOp) continue;
      nodes.push([field, astOp, resolveLeaf(raw)]);
    }
    if (nodes.length === 0) return [];
    return nodes.length === 1 ? (nodes[0] as unknown[]) : ["and", ...nodes];
  }
  // Bare value → equality.
  return [field, "=", resolveLeaf(condition)];
}

/**
 * Convert a Mongo-style filter object into the ObjectQL array AST consumed by
 * `client.data.find`. Returns `undefined` for an empty/absent filter, a single
 * condition node for one field, or an `["and", …]` compound for several.
 */
export function mongoFilterToAst(
  filter: Record<string, unknown> | null | undefined,
): unknown[] | undefined {
  if (!filter || typeof filter !== "object") return undefined;
  const entries = Object.entries(filter).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return undefined;

  const nodes = entries.map(([field, cond]) => fieldToAst(field, cond)).filter((n) => n.length > 0);
  if (nodes.length === 0) return undefined;
  return nodes.length === 1 ? (nodes[0] as unknown[]) : ["and", ...nodes];
}

/* ------------------------------------------------------------------ */
/*  Client-side row matching                                            */
/* ------------------------------------------------------------------ */

/**
 * Match a single value against a Mongo operator. Mirrors the operator
 * vocabulary of `MONGO_OP_TO_AST` so a filter authored for the data API
 * evaluates identically client-side.
 */
const MONGO_OP_MATCHERS: Record<string, (actual: unknown, expected: unknown) => boolean> = {
  $eq: (a, b) => a === b,
  $ne: (a, b) => a !== b,
  $gt: (a, b) => (a as number) > (b as number),
  $gte: (a, b) => (a as number) >= (b as number),
  $lt: (a, b) => (a as number) < (b as number),
  $lte: (a, b) => (a as number) <= (b as number),
  $in: (a, b) => Array.isArray(b) && b.includes(a),
  $nin: (a, b) => Array.isArray(b) && !b.includes(a),
  $contains: (a, b) => String(a).includes(String(b)),
  $startsWith: (a, b) => String(a).startsWith(String(b)),
  $endsWith: (a, b) => String(a).endsWith(String(b)),
};

/**
 * Evaluate a Mongo-style filter object against an in-memory record. Used to
 * compute filtered measures client-side (e.g. a "completed" count that backs
 * the numerator of a completion-rate ratio) without a second server round-trip.
 *
 * Supports bare-value equality (`{ status: "done" }`) and the operator forms in
 * `MONGO_OP_MATCHERS`; relative-date macros are resolved the same way the
 * server-bound AST resolves them. An absent/empty filter matches every record.
 * Unknown operators are treated as a pass so an unsupported clause never
 * silently excludes everything.
 */
export function matchesMongoFilter(
  record: Record<string, unknown>,
  filter: Record<string, unknown> | null | undefined,
): boolean {
  if (!filter || typeof filter !== "object") return true;
  return Object.entries(filter).every(([field, cond]) => {
    const actual = record[field];
    if (
      cond !== null &&
      typeof cond === "object" &&
      !Array.isArray(cond) &&
      Object.keys(cond as object).some((k) => k.startsWith("$"))
    ) {
      return Object.entries(cond as Record<string, unknown>).every(([op, raw]) => {
        const matcher = MONGO_OP_MATCHERS[op];
        return matcher ? matcher(actual, resolveLeaf(raw)) : true;
      });
    }
    return actual === resolveLeaf(cond);
  });
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
