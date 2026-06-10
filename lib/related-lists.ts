/**
 * Related-list discovery (ObjectStack 8.0).
 *
 * 8.0 lets a relationship field (a `lookup` / `master_detail` field on a CHILD
 * object that references a parent) opt into being surfaced on the parent's
 * detail page as a related list, via these field-metadata props:
 *
 *   reference:           "<parent object name>"   // which object it points to
 *   relatedList:         true                      // show it on the parent detail
 *   relatedListTitle?:   "Line Items"              // section title override
 *   relatedListColumns?: ["sku", "qty", ...]       // columns to display
 *
 * Discovery is therefore a scan across all objects for child fields that
 * reference a given parent with `relatedList: true`. The whole object set
 * (with fields inline) comes back in a single `meta.getItems('object')`
 * request, so this is one network round-trip, not N+1.
 *
 * This module is the pure core (no client, no React) so the discovery and
 * query-building logic is fully unit-testable; `hooks/useRelatedLists` wires it
 * to the data client.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single field's metadata, narrowed to the relationship props we read. */
export interface RelationshipFieldMeta {
  type?: string;
  reference?: string;
  relatedList?: boolean;
  relatedListTitle?: string;
  relatedListColumns?: unknown;
  label?: string;
  [key: string]: unknown;
}

/** An object's metadata, narrowed to what discovery needs. */
export interface ScannableObjectMeta {
  name: string;
  label?: string;
  fields?: Record<string, RelationshipFieldMeta>;
  [key: string]: unknown;
}

/** A discovered related list: a child object linked to the parent by a field. */
export interface RelatedListDescriptor {
  /** Child object name to query. */
  childObject: string;
  /** Human label for the child object. */
  childLabel: string;
  /** Field on the child that references the parent (the filter key). */
  relationshipField: string;
  /** Section title (relatedListTitle ?? child label). */
  title: string;
  /** Columns to display (normalized field names; may be empty). */
  columns: string[];
}

/* ------------------------------------------------------------------ */
/*  Column normalization                                              */
/* ------------------------------------------------------------------ */

/**
 * Normalize `relatedListColumns` to a list of field-name strings. The spec
 * types it as `any[]`; in practice entries are either bare field names or
 * column objects (`{ field }` / `{ name }`). Unknown shapes are dropped.
 */
export function relatedListColumnNames(columns: unknown): string[] {
  if (!Array.isArray(columns)) return [];
  const names: string[] = [];
  for (const col of columns) {
    if (typeof col === "string" && col.trim() !== "") {
      names.push(col);
    } else if (col && typeof col === "object") {
      const c = col as Record<string, unknown>;
      const name = c.field ?? c.name;
      if (typeof name === "string" && name.trim() !== "") names.push(name);
    }
  }
  return names;
}

/* ------------------------------------------------------------------ */
/*  Discovery                                                          */
/* ------------------------------------------------------------------ */

/** A relationship field type can anchor a related list. */
const RELATIONSHIP_TYPES = new Set(["lookup", "master_detail", "masterDetail"]);

/**
 * Find the related lists to show on `parentObjectName`'s detail page: every
 * child object that has a field referencing the parent with `relatedList:
 * true`. Deterministic order (object name, then field name).
 */
export function discoverRelatedLists(
  parentObjectName: string,
  objects: ScannableObjectMeta[],
): RelatedListDescriptor[] {
  if (!parentObjectName || !Array.isArray(objects)) return [];

  const descriptors: RelatedListDescriptor[] = [];
  for (const obj of objects) {
    if (!obj?.fields) continue;
    for (const [fieldName, field] of Object.entries(obj.fields)) {
      if (!field || field.relatedList !== true) continue;
      if (field.reference !== parentObjectName) continue;
      // A field with `reference` is a relationship; accept known relationship
      // types, and also accept an unspecified type as long as it references
      // the parent (some metadata omits `type` on reference fields).
      if (field.type && !RELATIONSHIP_TYPES.has(field.type)) continue;

      descriptors.push({
        childObject: obj.name,
        childLabel: obj.label ?? obj.name,
        relationshipField: fieldName,
        title: field.relatedListTitle ?? obj.label ?? obj.name,
        columns: relatedListColumnNames(field.relatedListColumns),
      });
    }
  }

  descriptors.sort(
    (a, b) =>
      a.childObject.localeCompare(b.childObject) ||
      a.relationshipField.localeCompare(b.relationshipField),
  );
  return descriptors;
}

/* ------------------------------------------------------------------ */
/*  Query building                                                    */
/* ------------------------------------------------------------------ */

export interface RelatedListQuery {
  object: string;
  options: {
    filters: [string, "=", string];
    select?: string[];
    top: number;
  };
}

/**
 * Build the `client.data.find` query for a related list: child records whose
 * relationship field equals the parent record id.
 */
export function relatedListQuery(
  descriptor: RelatedListDescriptor,
  parentId: string,
  limit = 20,
): RelatedListQuery {
  return {
    object: descriptor.childObject,
    options: {
      filters: [descriptor.relationshipField, "=", parentId],
      ...(descriptor.columns.length > 0 ? { select: descriptor.columns } : {}),
      top: limit,
    },
  };
}
