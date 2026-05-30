/**
 * Render an ObjectStack record's display title.
 *
 * Objects publish a `titleFormat` template (e.g. `"{full_name} - {company}"`)
 * and a `compactLayout` field list in their metadata — this is the canonical
 * way to title a record, far better than guessing a `name`/`title` field. See
 * the `objectstack-record-title-format` reference for the convention.
 */

/**
 * Matches a title-template token in any dialect this codebase emits:
 *   `{name}`                  — single-brace
 *   `{{name}}`                — mustache / handlebars
 *   `{{record.description}}`  — mustache with a `record.` accessor prefix
 * The optional `record.` prefix is stripped so the captured group is always the
 * bare field name. Without this, a `{{record.x}}` template left the outer braces
 * behind and rendered titles as a literal `{}`.
 */
export const TITLE_TOKEN_RE = /\{\{?\s*(?:record\.)?([\w.]+)\s*\}?\}/g;

/** Conventional single-field title fallbacks, in priority order. */
const DISPLAY_FIELDS = ["name", "full_name", "title", "subject", "label"];

/** Field names referenced by a title template (in any supported dialect). */
export function titleTemplateFields(source: string): string[] {
  return Array.from(source.matchAll(TITLE_TOKEN_RE), (m) => m[1]);
}

/**
 * Fill a title template against a record, resolving tokens in every supported
 * dialect and trimming separators left dangling by empty tokens. Returns the
 * trimmed result (possibly empty if no token resolved).
 */
export function fillTitleTemplate(
  source: string,
  record: Record<string, unknown>,
): string {
  return source
    .replace(TITLE_TOKEN_RE, (_m, key: string) => asString(record[key]) ?? "")
    .replace(/^\s*[-–—|/·]\s*/, "")
    .replace(/\s*[-–—|/·]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface ObjectMetaLike {
  label?: string;
  pluralLabel?: string;
  titleFormat?: unknown;
  compactLayout?: unknown;
  fields?: Record<string, Record<string, unknown>>;
}

/** Some meta values arrive as JSON strings; coerce to objects/arrays. */
function parseMaybeJSON(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/** The `{field}` template string from an object's `titleFormat`, if any. */
export function getTitleSource(meta: ObjectMetaLike | null | undefined): string | undefined {
  const parsed = parseMaybeJSON(meta?.titleFormat) as { source?: unknown } | null;
  return typeof parsed?.source === "string" ? parsed.source : undefined;
}

/** The ordered `compactLayout` field list from an object's metadata. */
export function getCompactLayout(meta: ObjectMetaLike | null | undefined): string[] {
  const parsed = parseMaybeJSON(meta?.compactLayout);
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

/**
 * Render `record`'s display title using the object's `titleFormat` template,
 * falling back to compactLayout's lead field, a conventional name field, then
 * the record id.
 */
export function renderRecordTitle(
  meta: ObjectMetaLike | null | undefined,
  record: Record<string, unknown> | null | undefined,
  fallback = "Record",
): string {
  if (!record) return fallback;

  const source = getTitleSource(meta);
  if (source) {
    const filled = fillTitleTemplate(source, record);
    if (filled) return filled;
  }

  const compact = getCompactLayout(meta);
  const candidates = [...compact, ...DISPLAY_FIELDS];
  for (const field of candidates) {
    const v = asString(record[field]);
    if (v) return v;
  }

  return asString(record.id ?? record._id) ?? fallback;
}
