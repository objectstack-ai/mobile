/**
 * Page Renderer – parses and validates a server-driven PageSchema
 * and resolves its regions/components into a renderable tree.
 *
 * Spec compliance: Rule #1 SDUI (render from PageSchema).
 */

/* ------------------------------------------------------------------ */
/*  Page contract types (aligned with @objectstack/spec/ui PageSchema) */
/* ------------------------------------------------------------------ */

/**
 * Page component type. Mirrors the authoritative `PageComponentType`
 * (spec/ui) component-slot identifiers, with `view:*` and `custom`
 * retained for the native engine's composed views.
 */
export type PageComponentType =
  | "page:header"
  | "page:footer"
  | "page:sidebar"
  | "page:tabs"
  | "page:accordion"
  | "page:card"
  | "page:section"
  | "record:details"
  | "record:highlights"
  | "record:related_list"
  | "record:activity"
  | "record:chatter"
  | "record:path"
  | "record:alert"
  | "view:list"
  | "view:form"
  | "view:chart"
  | "view:dashboard"
  | "custom";

export interface PageComponent {
  type: PageComponentType | string;
  props?: Record<string, unknown>;
}

export interface PageRegion {
  name: string;
  /** Region width hint (spec `PageRegion.width`), e.g. a column span. */
  width?: number | string;
  components: PageComponent[];
}

/**
 * Page variable. `type` and `defaultValue` follow the authoritative spec
 * `PageVariable`. `default` is kept as a deprecated alias for payloads that
 * have not yet migrated.
 */
export interface PageVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "record_id";
  /** Default value (spec `PageVariable.defaultValue`). */
  defaultValue?: unknown;
  /** @deprecated Use `defaultValue` (spec field). Read as a fallback. */
  default?: unknown;
}

/**
 * Page schema.
 *
 * NOTE: the authoritative spec `PageSchema` describes layout via a `type`
 * (`PageType`) plus `blankLayout`, not the `layout` field used here. The
 * native renderer keeps `layout` as a simplified convenience; full
 * `PageType`/`blankLayout` support is tracked as a later alignment phase.
 */
export interface PageSchema {
  name: string;
  label?: string;
  description?: string;
  icon?: string;
  object?: string;
  layout?: "single" | "two-column" | "tabs" | "custom";
  regions: PageRegion[];
  variables?: PageVariable[];
}

/* ------------------------------------------------------------------ */
/*  Resolved tree                                                      */
/* ------------------------------------------------------------------ */

export interface ResolvedComponent {
  type: PageComponentType | string;
  props: Record<string, unknown>;
}

export interface ResolvedRegion {
  name: string;
  components: ResolvedComponent[];
}

export interface ResolvedPage {
  name: string;
  label: string;
  object?: string;
  layout: "single" | "two-column" | "tabs" | "custom";
  regions: ResolvedRegion[];
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate a raw PageSchema payload.
 * Returns null if invalid, or the validated schema if valid.
 */
export function validatePageSchema(
  raw: unknown,
): PageSchema | null {
  if (!raw || typeof raw !== "object") return null;
  const page = raw as Record<string, unknown>;
  if (typeof page.name !== "string") return null;
  if (!Array.isArray(page.regions)) return null;
  return raw as PageSchema;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const VARIABLE_PATTERN = /^\{\{(.+)\}\}$/;

/* ------------------------------------------------------------------ */
/*  Resolution                                                         */
/* ------------------------------------------------------------------ */

/**
 * Resolve variable bindings in a page component's props.
 */
function resolveProps(
  props: Record<string, unknown> | undefined,
  variables: Record<string, unknown>,
): Record<string, unknown> {
  if (!props) return {};
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") {
      const match = VARIABLE_PATTERN.exec(value);
      if (match) {
        const varName = match[1].trim();
        resolved[key] = variables[varName] ?? value;
        continue;
      }
    }
    resolved[key] = value;
  }
  return resolved;
}

/**
 * Resolve a PageSchema into a fully-resolved render tree.
 */
export function resolvePageSchema(
  schema: PageSchema,
  variables?: Record<string, unknown>,
): ResolvedPage {
  const vars: Record<string, unknown> = {};

  // Set defaults from schema variables. Prefer the authoritative spec field
  // `defaultValue`, falling back to the legacy `default` alias.
  if (schema.variables) {
    for (const v of schema.variables) {
      vars[v.name] = v.defaultValue ?? v.default;
    }
  }
  // Override with provided variables
  if (variables) {
    Object.assign(vars, variables);
  }

  const regions: ResolvedRegion[] = schema.regions.map((region) => ({
    name: region.name,
    components: region.components.map((comp) => ({
      type: comp.type,
      props: resolveProps(comp.props, vars),
    })),
  }));

  return {
    name: schema.name,
    label: schema.label ?? schema.name,
    object: schema.object,
    layout: schema.layout ?? "single",
    regions,
  };
}
