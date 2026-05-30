import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClient } from "@objectstack/client-react";
import { useApps, type NavigationItem } from "~/hooks/useApps";
import {
  createCompoundFilter,
  createSimpleFilter,
  serializeFilterTree,
} from "~/lib/query-builder";
import { fillTitleTemplate, titleTemplateFields } from "~/lib/record-title";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SearchResultRecord {
  id: string;
  title: string;
  subtitle?: string;
  objectName: string;
  appName: string;
}

export interface SearchResultGroup {
  objectName: string;
  objectLabel: string;
  appName: string;
  records: SearchResultRecord[];
}

interface SearchableObject {
  objectName: string;
  /** Nav label — fallback object display name. */
  label: string;
  appName: string;
}

interface ObjectSearchInfo {
  /** Text-ish fields to match the keyword against (capped). */
  textFields: string[];
  /** `titleFormat` template (e.g. "{full_name} - {company}"), if defined. */
  titleSource?: string;
  /** Field used as the result row title when no template applies. */
  displayField: string;
  /** Optional secondary field shown beneath the title. */
  subtitleField?: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Field heuristics                                                    */
/* ------------------------------------------------------------------ */

/** Field types whose values are free text and worth a `contains` match. */
const TEXT_TYPES = new Set([
  "text",
  "textarea",
  "email",
  "url",
  "phone",
  "markdown",
  "richtext",
  "autonumber",
]);

/** Preferred fields to use as a record's display title, in priority order. */
const DISPLAY_FIELDS = ["name", "full_name", "title", "subject", "label"];

/** Field types unsuitable as a record's title (lookups, flags, dates, …). */
const NON_TITLE_TYPES = new Set([
  "lookup",
  "master_detail",
  "boolean",
  "toggle",
  "address",
  "datetime",
  "date",
  "time",
  "currency",
  "number",
]);

/** Max text fields to OR together per object — keeps the filter small. */
const MAX_TEXT_FIELDS = 6;
/** Max records fetched per object per search. */
const PER_OBJECT_LIMIT = 5;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Flatten a navigation tree into the object-type leaves it targets. */
function collectObjects(
  items: NavigationItem[],
  appName: string,
  acc: SearchableObject[],
): void {
  for (const item of items) {
    if (item.type === "object" && item.objectName) {
      acc.push({ objectName: item.objectName, label: item.label, appName });
    }
    if (item.children?.length) {
      collectObjects(item.children, appName, acc);
    }
  }
}

interface ObjectMetaShape {
  label?: string;
  pluralLabel?: string;
  fields?: Record<string, Record<string, unknown>>;
  /** Record-title template, e.g. `{ source: "{full_name} - {company}" }`. */
  titleFormat?: unknown;
  /** Ordered fields the object surfaces in its compact card layout. */
  compactLayout?: unknown;
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

function parseTitleSource(titleFormat: unknown): string | undefined {
  const parsed = parseMaybeJSON(titleFormat) as { source?: unknown } | null;
  return typeof parsed?.source === "string" ? parsed.source : undefined;
}

function parseStringArray(value: unknown): string[] {
  const parsed = parseMaybeJSON(value);
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
}

/** Pick searchable text fields + a title strategy from object meta. */
function deriveSearchInfo(
  meta: ObjectMetaShape | null,
  fallbackLabel: string,
): ObjectSearchInfo | null {
  const fields = meta?.fields;
  if (!fields) return null;

  const names = Object.keys(fields).filter((n) => !n.startsWith("_"));
  const textFields = names.filter((n) => {
    const type = String(fields[n]?.type ?? "");
    return TEXT_TYPES.has(type);
  });
  if (textFields.length === 0) return null;

  const titleSource = parseTitleSource(meta?.titleFormat);
  const compact = parseStringArray(meta?.compactLayout);

  // Single-field fallback title: prefer the object's compact-layout lead field,
  // then a conventional name field, then the first text field.
  const displayField =
    compact.find(
      (f) => names.includes(f) && !NON_TITLE_TYPES.has(String(fields[f]?.type ?? "")),
    ) ??
    DISPLAY_FIELDS.find((d) => names.includes(d)) ??
    textFields[0];

  const titleFields = titleSource ? titleTemplateFields(titleSource) : [displayField];
  const subtitleField =
    (names.includes("email") && !titleFields.includes("email") ? "email" : undefined) ??
    textFields.find((f) => !titleFields.includes(f));

  // Build the filter field list from real text columns only. The display field
  // is moved to the front *only if* it is itself a filterable text field —
  // never inject a formula/lookup display field (e.g. `full_name`) here, or the
  // `contains` query would target an unfilterable column and fail.
  const ordered = textFields.includes(displayField)
    ? [displayField, ...textFields.filter((f) => f !== displayField)]
    : textFields;
  return {
    textFields: ordered.slice(0, MAX_TEXT_FIELDS),
    titleSource,
    displayField,
    subtitleField,
    label: meta?.pluralLabel ?? meta?.label ?? fallbackLabel,
  };
}

/** Render a record's title from its template, falling back to a single field. */
function renderTitle(info: ObjectSearchInfo, rec: Record<string, unknown>): string {
  if (info.titleSource) {
    const filled = fillTitleTemplate(info.titleSource, rec);
    if (filled) return filled;
  }
  return (
    asString(rec[info.displayField]) ??
    asString(rec.name) ??
    asString(rec.id ?? rec._id) ??
    "(untitled)"
  );
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export interface UseGlobalSearchResult {
  query: string;
  setQuery: (q: string) => void;
  groups: SearchResultGroup[];
  isSearching: boolean;
  /** True once a non-empty query has produced a (possibly empty) result. */
  hasSearched: boolean;
  totalCount: number;
  /** Number of distinct objects available to search across. */
  objectCount: number;
}

/**
 * Real cross-object global search.
 *
 * Discovers every object reachable from the installed apps' navigation, learns
 * each object's text fields from its metadata (once), and on a debounced query
 * fans out a `contains` match across those fields — returning results grouped
 * by object. Backed by `client.data.find` (the same path `useQuery` drives).
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const client = useClient();
  const { apps } = useApps();

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Per-object field info, learned once from metadata.
  const infoRef = useRef<Map<string, ObjectSearchInfo>>(new Map());
  // Monotonic request id so stale fan-outs can't clobber fresh results.
  const reqRef = useRef(0);

  /** Deduped list of objects discovered from app navigation. */
  const searchable = useMemo(() => {
    const acc: SearchableObject[] = [];
    for (const app of apps) {
      collectObjects(app.navigation ?? [], app.name, acc);
    }
    const seen = new Set<string>();
    return acc.filter((o) => {
      if (seen.has(o.objectName)) return false;
      seen.add(o.objectName);
      return true;
    });
  }, [apps]);

  // Learn each object's searchable fields once (parallel, cached by name).
  useEffect(() => {
    let cancelled = false;
    const missing = searchable.filter((o) => !infoRef.current.has(o.objectName));
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (o) => {
        try {
          const meta = (await client.meta.getItem(
            "object",
            o.objectName,
          )) as ObjectMetaShape;
          const info = deriveSearchInfo(meta, o.label);
          if (info && !cancelled) infoRef.current.set(o.objectName, info);
        } catch {
          /* object meta unreadable — skip it from search */
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [client, searchable]);

  const runSearch = useCallback(
    async (raw: string) => {
      const term = raw.trim();
      const reqId = ++reqRef.current;
      if (term.length === 0) {
        setGroups([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }
      setIsSearching(true);

      const settled = await Promise.all(
        searchable.map(async (obj): Promise<SearchResultGroup | null> => {
          const info = infoRef.current.get(obj.objectName);
          if (!info || info.textFields.length === 0) return null;

          const root = createCompoundFilter(
            "OR",
            info.textFields.map((f) => {
              const node = createSimpleFilter(f, "contains");
              node.value = term;
              return node;
            }),
          );
          const filters = serializeFilterTree(root);
          if (!filters) return null;

          try {
            const res = await client.data.find(obj.objectName, {
              filters,
              top: PER_OBJECT_LIMIT,
            } as never);
            const records = ((res as { records?: unknown[]; value?: unknown[] })
              ?.records ??
              (res as { value?: unknown[] })?.value ??
              []) as Record<string, unknown>[];
            if (records.length === 0) return null;

            const mapped: SearchResultRecord[] = records.map((rec) => {
              const id = String(rec.id ?? rec._id ?? "");
              const title = renderTitle(info, rec);
              const subtitle = info.subtitleField
                ? asString(rec[info.subtitleField])
                : undefined;
              return {
                id,
                title,
                subtitle,
                objectName: obj.objectName,
                appName: obj.appName,
              };
            });

            return {
              objectName: obj.objectName,
              objectLabel: info.label,
              appName: obj.appName,
              records: mapped,
            };
          } catch {
            return null;
          }
        }),
      );

      // A newer search started while we awaited — drop these results.
      if (reqId !== reqRef.current) return;
      setGroups(settled.filter((g): g is SearchResultGroup => g !== null));
      setHasSearched(true);
      setIsSearching(false);
    },
    [client, searchable],
  );

  // Debounce keystrokes.
  useEffect(() => {
    if (query.trim().length === 0) {
      reqRef.current++;
      setGroups([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => void runSearch(query), 300);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.records.length, 0),
    [groups],
  );

  return {
    query,
    setQuery,
    groups,
    isSearching,
    hasSearched,
    totalCount,
    objectCount: searchable.length,
  };
}
