/**
 * Conditional field expressions (ObjectStack 8.0).
 *
 * Fields in the 8.0 metadata spec can carry `visibleWhen`, `readonlyWhen`, and
 * `requiredWhen` properties. Each is an expression object:
 *
 *   { dialect: "cel" | "js" | "cron" | "template", source?: string, ast?, meta? }
 *
 * The server evaluates these in some contexts, but for a live form the mobile
 * client must evaluate them against the in-progress record values to drive
 * field visibility / editability / validation as the user types.
 *
 * `@objectstack/client` ships expression *builders* (`cel`, `expression`, …)
 * but no runtime evaluator, so this module provides a small, dependency-free
 * one. It deliberately does NOT use `eval`/`new Function` — that is a security
 * risk and is unavailable under Hermes' production config — and instead parses
 * a focused, safe subset of the boolean-expression grammar shared by the `cel`
 * and `js` dialects (comparisons, logical/membership operators, arithmetic,
 * grouping, dotted identifiers, literals).
 *
 * Anything it can't evaluate — an unsupported dialect (`cron`/`template`), a
 * missing `source`, a parse error, or a runtime error — resolves to the caller-
 * supplied `fallback` so a malformed condition can never hide a field the user
 * needs or block a save.
 */

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type ExpressionDialect = "cel" | "js" | "cron" | "template";

/** A conditional-field expression as carried on field metadata. */
export interface ConditionExpression {
  dialect?: ExpressionDialect | string;
  source?: string;
  ast?: unknown;
  meta?: unknown;
}

/**
 * Any object that may carry conditional-field expressions — a field definition
 * or a form-field meta. Keys are read defensively (the values are `unknown`).
 */
export interface ConditionHolder {
  visibleWhen?: unknown;
  readonlyWhen?: unknown;
  requiredWhen?: unknown;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Tokenizer                                                          */
/* ------------------------------------------------------------------ */

type TokenType = "num" | "str" | "ident" | "op" | "punct" | "kw";
interface Token {
  type: TokenType;
  value: string;
}

// Multi-char operators must be tried before their single-char prefixes.
const OPERATORS = [
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "<",
  ">",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
];
const KEYWORDS = new Set(["true", "false", "null", "in"]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    // String literal (single or double quoted, with backslash escapes)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = "";
      i++;
      while (i < n && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < n) {
          const next = input[i + 1];
          str +=
            next === "n" ? "\n" : next === "t" ? "\t" : next === "r" ? "\r" : next;
          i += 2;
        } else {
          str += input[i];
          i++;
        }
      }
      if (i >= n) throw new Error("unterminated string");
      i++; // closing quote
      tokens.push({ type: "str", value: str });
      continue;
    }

    // Number literal (int or float)
    if (ch >= "0" && ch <= "9") {
      let num = "";
      while (i < n && ((input[i] >= "0" && input[i] <= "9") || input[i] === ".")) {
        num += input[i];
        i++;
      }
      tokens.push({ type: "num", value: num });
      continue;
    }

    // Identifier / keyword (allow dotted paths to be tokenized per-segment;
    // the parser stitches `a . b` back into a path).
    if (ch === "_" || ch === "$" || isAlpha(ch)) {
      let id = "";
      while (i < n && (input[i] === "_" || input[i] === "$" || isAlphaNum(input[i]))) {
        id += input[i];
        i++;
      }
      tokens.push({ type: KEYWORDS.has(id) ? "kw" : "ident", value: id });
      continue;
    }

    // Parentheses / member dot / list brackets
    if (ch === "(" || ch === ")" || ch === "." || ch === "[" || ch === "]" || ch === ",") {
      tokens.push({ type: "punct", value: ch });
      i++;
      continue;
    }

    // Operators
    const op = OPERATORS.find((o) => input.startsWith(o, i));
    if (op) {
      tokens.push({ type: "op", value: op });
      i += op.length;
      continue;
    }

    throw new Error(`unexpected character "${ch}"`);
  }

  return tokens;
}

function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}
function isAlphaNum(ch: string): boolean {
  return isAlpha(ch) || (ch >= "0" && ch <= "9");
}

/* ------------------------------------------------------------------ */
/*  Parser (Pratt / precedence-climbing) → AST                         */
/* ------------------------------------------------------------------ */

type Node =
  | { kind: "lit"; value: unknown }
  | { kind: "path"; path: string[] }
  | { kind: "list"; items: Node[] }
  | { kind: "unary"; op: string; operand: Node }
  | { kind: "binary"; op: string; left: Node; right: Node };

// Lower number = lower precedence (binds last).
const BINARY_PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "==": 3,
  "!=": 3,
  "===": 3,
  "!==": 3,
  "<": 4,
  "<=": 4,
  ">": 4,
  ">=": 4,
  in: 4,
  "+": 5,
  "-": 5,
  "*": 6,
  "/": 6,
  "%": 6,
};

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseExpression(0);
    if (this.pos < this.tokens.length) {
      throw new Error(`unexpected token "${this.tokens[this.pos].value}"`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("unexpected end of expression");
    this.pos++;
    return t;
  }

  private parseExpression(minPrec: number): Node {
    let left = this.parseUnary();

    let t = this.peek();
    while (t) {
      const op = t.value;
      const isBinary =
        (t.type === "op" || (t.type === "kw" && op === "in")) &&
        op in BINARY_PRECEDENCE;
      if (!isBinary) break;
      const prec = BINARY_PRECEDENCE[op];
      if (prec < minPrec) break;
      this.next();
      // All supported operators are left-associative.
      const right = this.parseExpression(prec + 1);
      left = { kind: "binary", op, left, right };
      t = this.peek();
    }

    return left;
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (t && t.type === "op" && (t.value === "!" || t.value === "-")) {
      this.next();
      return { kind: "unary", op: t.value, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.next();

    if (t.type === "num") {
      return { kind: "lit", value: Number(t.value) };
    }
    if (t.type === "str") {
      return { kind: "lit", value: t.value };
    }
    if (t.type === "kw") {
      if (t.value === "true") return { kind: "lit", value: true };
      if (t.value === "false") return { kind: "lit", value: false };
      if (t.value === "null") return { kind: "lit", value: null };
      throw new Error(`unexpected keyword "${t.value}"`);
    }
    if (t.type === "punct" && t.value === "(") {
      const node = this.parseExpression(0);
      this.expectPunct(")");
      return node;
    }
    if (t.type === "punct" && t.value === "[") {
      // List literal: [a, b, c] — supports the right-hand side of `in`.
      const items: Node[] = [];
      if (!(this.peek()?.type === "punct" && this.peek()?.value === "]")) {
        items.push(this.parseExpression(0));
        while (this.peek()?.type === "punct" && this.peek()?.value === ",") {
          this.next();
          items.push(this.parseExpression(0));
        }
      }
      this.expectPunct("]");
      return { kind: "list", items };
    }
    if (t.type === "ident") {
      const path = [t.value];
      while (this.peek()?.type === "punct" && this.peek()?.value === ".") {
        this.next();
        const seg = this.next();
        if (seg.type !== "ident" && seg.type !== "kw") {
          throw new Error("expected identifier after '.'");
        }
        path.push(seg.value);
      }
      return { kind: "path", path };
    }

    throw new Error(`unexpected token "${t.value}"`);
  }

  private expectPunct(value: string): void {
    const t = this.next();
    if (t.type !== "punct" || t.value !== value) {
      throw new Error(`expected "${value}"`);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Evaluator                                                          */
/* ------------------------------------------------------------------ */

function resolvePath(path: string[], context: Record<string, unknown>): unknown {
  let cur: unknown = context;
  for (const seg of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** Loose equality tuned for metadata conditions (null≈undefined, numeric coercion). */
function looseEq(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "number" && typeof b === "number") return a === b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  if (typeof a === "string" && typeof b === "string") return a === b;
  // Mixed types: fall back to JS loose equality (e.g. 2 == "2").
  // eslint-disable-next-line eqeqeq
  return a == b;
}

function toComparable(v: unknown): number | string {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v == null) return NaN;
  const num = Number(v);
  if (!Number.isNaN(num) && String(v).trim() !== "") return num;
  return String(v);
}

function compare(op: string, a: unknown, b: unknown): boolean {
  const ca = toComparable(a);
  const cb = toComparable(b);
  // If either side isn't numeric, compare as strings for stable ordering.
  const [x, y] =
    typeof ca === "number" && typeof cb === "number"
      ? [ca, cb]
      : [String(a ?? ""), String(b ?? "")];
  switch (op) {
    case "<":
      return x < y;
    case "<=":
      return x <= y;
    case ">":
      return x > y;
    case ">=":
      return x >= y;
    default:
      return false;
  }
}

function isIn(needle: unknown, haystack: unknown): boolean {
  if (Array.isArray(haystack)) return haystack.some((h) => looseEq(h, needle));
  if (typeof haystack === "string") return haystack.includes(String(needle));
  if (haystack && typeof haystack === "object") {
    return Object.prototype.hasOwnProperty.call(haystack, String(needle));
  }
  return false;
}

function evalNode(node: Node, context: Record<string, unknown>): unknown {
  switch (node.kind) {
    case "lit":
      return node.value;
    case "path":
      return resolvePath(node.path, context);
    case "list":
      return node.items.map((it) => evalNode(it, context));
    case "unary": {
      const v = evalNode(node.operand, context);
      return node.op === "!" ? !truthy(v) : -Number(v);
    }
    case "binary": {
      const { op } = node;
      // Short-circuit logical operators.
      if (op === "&&") {
        return truthy(evalNode(node.left, context)) && truthy(evalNode(node.right, context));
      }
      if (op === "||") {
        return truthy(evalNode(node.left, context)) || truthy(evalNode(node.right, context));
      }
      const a = evalNode(node.left, context);
      const b = evalNode(node.right, context);
      switch (op) {
        case "==":
        case "===":
          return looseEq(a, b);
        case "!=":
        case "!==":
          return !looseEq(a, b);
        case "<":
        case "<=":
        case ">":
        case ">=":
          return compare(op, a, b);
        case "in":
          return isIn(a, b);
        case "+":
          return typeof a === "string" || typeof b === "string"
            ? String(a ?? "") + String(b ?? "")
            : Number(a) + Number(b);
        case "-":
          return Number(a) - Number(b);
        case "*":
          return Number(a) * Number(b);
        case "/":
          return Number(a) / Number(b);
        case "%":
          return Number(a) % Number(b);
        default:
          throw new Error(`unknown operator "${op}"`);
      }
    }
  }
}

/** JS-style truthiness, with empty string and 0 falsy. */
function truthy(v: unknown): boolean {
  return Boolean(v);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

const BOOLEAN_DIALECTS = new Set(["cel", "js", undefined]);

/**
 * Evaluate a conditional-field expression to a boolean against `context`
 * (the record's current field values).
 *
 * Returns `fallback` when the expression is absent, of a non-boolean dialect
 * (`cron`/`template`), missing a `source`, or fails to parse/evaluate — so a
 * malformed condition is always safe (never hides a needed field or blocks a
 * save unexpectedly).
 */
export function evaluateCondition(
  expr: unknown,
  context: Record<string, unknown>,
  fallback: boolean,
): boolean {
  if (!expr || typeof expr !== "object") return fallback;
  const { dialect, source } = expr as ConditionExpression;
  if (!BOOLEAN_DIALECTS.has(dialect as string | undefined)) return fallback;
  if (typeof source !== "string" || source.trim() === "") return fallback;

  try {
    const ast = new Parser(tokenize(source)).parse();
    return truthy(evalNode(ast, context ?? {}));
  } catch {
    return fallback;
  }
}

/**
 * Whether a field should be shown. A field is visible unless it carries a
 * `visibleWhen` expression that evaluates false. Default: visible.
 */
export function isFieldVisible(
  field: ConditionHolder | undefined | null,
  context: Record<string, unknown>,
): boolean {
  return evaluateCondition(field?.visibleWhen, context, true);
}

/**
 * Whether a field should be locked by its `readonlyWhen` expression.
 * Default: not readonly (callers OR this with their own readonly sources).
 */
export function isFieldReadonlyByCondition(
  field: ConditionHolder | undefined | null,
  context: Record<string, unknown>,
): boolean {
  return evaluateCondition(field?.readonlyWhen, context, false);
}

/**
 * Whether a field is made required by its `requiredWhen` expression.
 * Default: not required (callers OR this with the static `required` flag).
 */
export function isFieldRequiredByCondition(
  field: ConditionHolder | undefined | null,
  context: Record<string, unknown>,
): boolean {
  return evaluateCondition(field?.requiredWhen, context, false);
}

/**
 * Whether a form/detail section should be shown, from its `visibleOn`
 * expression (spec `FormSection.visibleOn`). The string is evaluated as a
 * cel/js expression, so it supports both a bare field name (`is_active` →
 * truthy check) and a full predicate (`status == 'active'`). Default: visible.
 */
export function isSectionVisible(
  visibleOn: string | undefined | null,
  context: Record<string, unknown>,
): boolean {
  if (!visibleOn) return true;
  return evaluateCondition({ source: visibleOn }, context, true);
}
