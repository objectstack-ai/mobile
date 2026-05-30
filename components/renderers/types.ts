/**
 * Shared types for the ObjectUI Rendering Engine.
 *
 * The authoritative UI/data contracts live in `@objectstack/spec` (the same
 * package version the web ObjectUI engine renders against). To keep the
 * native renderers from drifting away from the platform schema, the
 * platform-agnostic contract types are re-exported directly from the spec
 * here rather than re-declared. The remaining interfaces are mobile-side
 * *view-models* — narrowings the RN renderers code against — and are
 * documented where they intentionally diverge from the spec shape.
 *
 * Rendering layer only differs by target: ObjectUI emits DOM, these
 * renderers emit React Native primitives. The schema contract is shared.
 */

import type { FieldType, SelectOption } from "@objectstack/spec/data";
import type {
  ListColumn,
  RowHeight,
  RowColorConfig,
  GroupingConfig,
  SelectionConfig,
  PaginationConfig,
  VisualizationType,
} from "@objectstack/spec/ui";

/* ------------------------------------------------------------------ */
/*  Authoritative contract types (re-exported from @objectstack/spec)  */
/* ------------------------------------------------------------------ */

export type {
  /** Object field type enum (spec/data). Superset of the values the RN
   *  field renderer handles — newer types fall back to a text display. */
  FieldType,
  /** Select/enum option (spec/data): `{ label, value, color?, default? }`. */
  SelectOption,
} from "@objectstack/spec/data";

export type {
  /** List column config (spec/ui). Includes `resizable`, `wrap`, `pinned`
   *  and `summary` in addition to the fields the list renderer reads. */
  ListColumn,
  /** Column footer aggregation operator (spec/ui). */
  ColumnSummary,
  /** Row density (spec/ui): `compact | short | medium | tall | extra_tall`. */
  RowHeight,
  /** Row colour-coding by field value (spec/ui). */
  RowColorConfig,
  /** Multi-field grouping config (spec/ui). */
  GroupingConfig,
  /** Selection mode config (spec/ui). */
  SelectionConfig,
  /** Pagination config (spec/ui). */
  PaginationConfig,
  /** Authoritative list visualization discriminator (spec/ui):
   *  `grid | kanban | gallery | calendar | timeline | gantt | map`. */
  VisualizationType,
} from "@objectstack/spec/ui";

/* ------------------------------------------------------------------ */
/*  Field Definition (mobile view-model)                               */
/* ------------------------------------------------------------------ */

/**
 * A field as consumed by the RN field renderer. Mirrors the relevant subset
 * of the spec `Field`, keyed on the authoritative `FieldType`/`SelectOption`.
 */
export interface FieldDefinition {
  name: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  List View (mobile view-model)                                      */
/* ------------------------------------------------------------------ */

/**
 * List view metadata as narrowed by the RN list renderer.
 *
 * NOTE on shape: the authoritative spec models a data view as
 * `View.list = { type: VisualizationType, columns, ... }`, where a single
 * list config drives every visualization (grid/kanban/calendar/…). The RN
 * engine currently flattens that into per-`viewType` renderers; this
 * view-model therefore carries the shared list-display options so renderers
 * can progressively honour them. Field names match the spec `ListView`.
 */
export interface ListViewMeta {
  name?: string;
  label?: string;
  /** Spec `ListView.type` (`VisualizationType`). Optional for back-compat. */
  type?: VisualizationType | string;
  columns?: (string | ListColumn)[];
  filter?: unknown;
  sort?: string | string[];
  pagination?: PaginationConfig | { pageSize?: number };
  selection?: SelectionConfig | { type?: "none" | "single" | "multiple" };
  /* --- spec-aligned display options (rendered progressively) --------- */
  /** Restrict free-text search to these fields (spec `searchableFields`). */
  searchableFields?: string[];
  /** Restrict the filter UI to these fields (spec `filterableFields`). */
  filterableFields?: string[];
  /** Row density (spec `rowHeight`). */
  rowHeight?: RowHeight;
  /** Multi-field grouping (spec `grouping`). */
  grouping?: GroupingConfig;
  /** Colour rows by a field value (spec `rowColor`). */
  rowColor?: RowColorConfig;
  /** Alternating row background (spec `striped`). */
  striped?: boolean;
  /** Cell borders (spec `bordered`). */
  bordered?: boolean;
  /** Show the total record count in the toolbar (spec `showRecordCount`). */
  showRecordCount?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Form View                                                          */
/* ------------------------------------------------------------------ */

export interface FormFieldMeta {
  field: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  readonly?: boolean;
  required?: boolean;
  hidden?: boolean;
  colSpan?: number;
  widget?: string;
  dependsOn?: string;
  visibleOn?: string;
}

/**
 * Form section. Field names match the spec `FormSection`; `fields` keeps the
 * mobile-typed `FormFieldMeta` union (the spec types section fields as
 * `string | unknown`, so the typed variant is retained here for safety).
 */
export interface FormSection {
  /** Stable identifier (spec `FormSection.name`). */
  name?: string;
  label?: string;
  /** Section description / helper text (spec `FormSection.description`). */
  description?: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  /** Conditional visibility expression (spec `FormSection.visibleOn`). */
  visibleOn?: string;
  fields: (string | FormFieldMeta)[];
}

export interface FormViewMeta {
  type?: "simple" | "tabbed" | "wizard" | "split" | "drawer" | "modal";
  sections?: FormSection[];
  groups?: FormSection[];
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export interface DashboardWidgetMeta {
  name: string;
  /** Spec dashboards key widgets by `id`; normalized into `name` on load. */
  id?: string;
  object: string;
  type?: string;
  title?: string;
  description?: string;
  valueField?: string;
  categoryField?: string;
  aggregate?: "count" | "sum" | "avg" | "min" | "max";
  /** Query filter applied before aggregating (e.g. `{ stage: "closed_won" }`). */
  filter?: Record<string, unknown>;
  chartConfig?: Record<string, unknown>;
  options?: unknown;
  /** Number of grid columns this widget spans (default 1) */
  span?: number;
}

export interface DashboardMeta {
  name: string;
  label?: string;
  description?: string;
  widgets: DashboardWidgetMeta[];
}

/* ------------------------------------------------------------------ */
/*  Action                                                             */
/* ------------------------------------------------------------------ */

export interface ActionMeta {
  name: string;
  label: string;
  type?: "url" | "script" | "api" | "modal" | "flow";
  icon?: string;
  target?: string;
  /** @deprecated Use `target` instead. Auto-migrated to `target` since spec v3.1. */
  execute?: string;
  locations?: (
    | "list_toolbar"
    | "list_item"
    | "record_header"
    | "record_more"
    | "record_related"
    | "global_nav"
  )[];
  component?: "action:button" | "action:icon" | "action:menu" | "action:group";
  confirmText?: string;
  successMessage?: string;
  refreshAfter?: boolean;
  visible?: string;
  params?: ActionParamMeta[];
  /** Spec v7 `Action.resultDialog` — reveal the action's response after it runs
   *  (e.g. TOTP URIs, OAuth secrets, backup codes). */
  resultDialog?: {
    title?: string;
    description?: string;
    acknowledge?: string;
    format?: "text" | "secret" | "json" | "qrcode" | "code-list";
    fields?: Array<{
      path: string;
      label?: string;
      format?: "text" | "secret" | "json" | "qrcode" | "code-list";
    }>;
  };
}

export interface ActionParamMeta {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
}

/* ------------------------------------------------------------------ */
/*  View (unified)                                                     */
/* ------------------------------------------------------------------ */

/**
 * View-type discriminator used by the RN `ViewRenderer` registry.
 *
 * This is the mobile rendering taxonomy. It overlaps with — but is broader
 * than — the authoritative `VisualizationType` (`grid | kanban | gallery |
 * calendar | timeline | gantt | map`): `list` maps to spec `grid`, while
 * `form`, `detail`, `dashboard`, `chart`, `report` and `page` are distinct
 * top-level renderers in the native engine. `gallery` and `gantt` are
 * included for parity with the spec even where a renderer is still pending.
 */
export type ViewType =
  | "list"
  | "form"
  | "detail"
  | "dashboard"
  | "kanban"
  | "calendar"
  | "chart"
  | "timeline"
  | "map"
  | "report"
  | "page"
  | "gallery"
  | "gantt";

export interface ViewMeta {
  name?: string;
  label?: string;
  object?: string;
  /** View type discriminator used by ViewRenderer */
  viewType: ViewType;
  listView?: ListViewMeta;
  formView?: FormViewMeta;
  dashboard?: DashboardMeta;
  actions?: ActionMeta[];
}
