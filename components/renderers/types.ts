/**
 * Shared types for the ObjectUI Rendering Engine.
 *
 * These local interfaces mirror the shapes returned by the ObjectStack SDK
 * (`@objectstack/spec/ui` and `@objectstack/spec/data`) so that renderers
 * can be coded against well-defined contracts even when the server payload
 * evolves.  The renderers accept `any` from the SDK hooks and narrow it
 * through these types.
 */

/* ------------------------------------------------------------------ */
/*  Field Types                                                        */
/* ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "phone"
  | "password"
  | "markdown"
  | "html"
  | "richtext"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "toggle"
  | "select"
  | "multiselect"
  | "radio"
  | "checkboxes"
  | "lookup"
  | "master_detail"
  | "tree"
  | "image"
  | "file"
  | "avatar"
  | "video"
  | "audio"
  | "formula"
  | "summary"
  | "autonumber"
  | "location"
  | "address"
  | "code"
  | "json"
  | "color"
  | "rating"
  | "slider"
  | "signature"
  | "qrcode"
  | "progress"
  | "tags"
  | "vector";

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  name: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  options?: SelectOption[];
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  List View                                                          */
/* ------------------------------------------------------------------ */

export interface ListColumn {
  field: string;
  label?: string;
  width?: number;
  align?: "left" | "center" | "right";
  hidden?: boolean;
  sortable?: boolean;
  type?: string;
  link?: boolean;
  action?: string;
}

export interface ListViewMeta {
  name?: string;
  label?: string;
  type?: string;
  columns?: (string | ListColumn)[];
  filter?: unknown;
  sort?: string | string[];
  pagination?: { pageSize?: number };
  selection?: { type?: "none" | "single" | "multiple" };
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

export interface FormSection {
  label?: string;
  columns?: number;
  collapsible?: boolean;
  collapsed?: boolean;
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
  object: string;
  type?: string;
  title?: string;
  valueField?: string;
  categoryField?: string;
  aggregate?: "count" | "sum" | "avg" | "min" | "max";
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
  | "page";

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
