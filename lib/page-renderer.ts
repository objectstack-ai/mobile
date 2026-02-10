/**
 * Page Renderer – parses and validates a server-driven PageSchema
 * and resolves its regions/components into a renderable tree.
 *
 * Spec compliance: Rule #1 SDUI (render from PageSchema).
 */

/* ------------------------------------------------------------------ */
/*  Spec-aligned types (mirrored from @objectstack/spec/ui)            */
/* ------------------------------------------------------------------ */

export type PageComponentType =
  | "page:header"
  | "page:tabs"
  | "page:card"
  | "record:details"
  | "record:related_list"
  | "record:highlights"
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
  components: PageComponent[];
}

export interface PageVariable {
  name: string;
  type: "string" | "number" | "boolean" | "record" | "query";
  default?: unknown;
}

export interface PageSchema {
  name: string;
  label?: string;
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

  // Set defaults from schema variables
  if (schema.variables) {
    for (const v of schema.variables) {
      vars[v.name] = v.default;
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
