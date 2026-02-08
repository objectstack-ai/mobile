// ViewRenderer — top-level dispatcher
export { ViewRenderer, registerRenderer } from "./ViewRenderer";
export type { ViewRendererProps } from "./ViewRenderer";

// View type renderers
export { ListViewRenderer } from "./ListViewRenderer";
export type { ListViewRendererProps } from "./ListViewRenderer";

export { FormViewRenderer } from "./FormViewRenderer";
export type { FormViewRendererProps } from "./FormViewRenderer";

export { DetailViewRenderer } from "./DetailViewRenderer";
export type { DetailViewRendererProps } from "./DetailViewRenderer";

export { DashboardViewRenderer } from "./DashboardViewRenderer";
export type { DashboardViewRendererProps, WidgetDataPayload } from "./DashboardViewRenderer";

// Field renderer
export { FieldRenderer, formatDisplayValue } from "./fields/FieldRenderer";
export type { FieldRendererProps } from "./fields/FieldRenderer";

// Types
export type {
  ViewType,
  ViewMeta,
  ListColumn,
  ListViewMeta,
  FormFieldMeta,
  FormSection,
  FormViewMeta,
  DashboardMeta,
  DashboardWidgetMeta,
  ActionMeta,
  ActionParamMeta,
  FieldDefinition,
  FieldType,
  SelectOption,
} from "./types";
