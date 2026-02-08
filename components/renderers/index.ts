// ViewRenderer — top-level dispatcher
export { ViewRenderer, registerRenderer } from "./ViewRenderer";
export type { ViewRendererProps } from "./ViewRenderer";

// View type renderers
export { ListViewRenderer } from "./ListViewRenderer";
export type { ListViewRendererProps } from "./ListViewRenderer";

export { FormViewRenderer } from "./FormViewRenderer";
export type { FormViewRendererProps } from "./FormViewRenderer";

export { DetailViewRenderer } from "./DetailViewRenderer";
export type { DetailViewRendererProps, RelatedListConfig } from "./DetailViewRenderer";

export { DashboardViewRenderer } from "./DashboardViewRenderer";
export type { DashboardViewRendererProps, WidgetDataPayload } from "./DashboardViewRenderer";

export { KanbanViewRenderer } from "./KanbanViewRenderer";
export type { KanbanViewRendererProps, KanbanColumn } from "./KanbanViewRenderer";

export { CalendarViewRenderer } from "./CalendarViewRenderer";
export type { CalendarViewRendererProps, CalendarEvent } from "./CalendarViewRenderer";

export { ChartViewRenderer } from "./ChartViewRenderer";
export type { ChartViewRendererProps, ChartType } from "./ChartViewRenderer";

export { TimelineViewRenderer } from "./TimelineViewRenderer";
export type { TimelineViewRendererProps, TimelineEntry } from "./TimelineViewRenderer";

export { MapViewRenderer, recordsToMarkers } from "./MapViewRenderer";
export type { MapViewRendererProps, MapMarker } from "./MapViewRenderer";

// Image gallery
export { ImageGallery } from "./ImageGallery";
export type { ImageGalleryProps, GalleryImage } from "./ImageGallery";

// Swipeable row
export { SwipeableRow } from "./SwipeableRow";
export type { SwipeableRowProps } from "./SwipeableRow";

// Filter drawer
export { FilterDrawer, FilterButton } from "./FilterDrawer";
export type { FilterDrawerProps, FilterButtonProps } from "./FilterDrawer";

// Field renderer
export { FieldRenderer, formatDisplayValue } from "./fields/FieldRenderer";
export type { FieldRendererProps } from "./fields/FieldRenderer";

// File field
export { FileField } from "./fields/FileField";
export type { FileFieldProps } from "./fields/FileField";

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
