import React, { Suspense } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { ListViewRenderer, type ListViewRendererProps } from "./ListViewRenderer";
import { FormViewRenderer, type FormViewRendererProps } from "./FormViewRenderer";
import { DetailViewRenderer, type DetailViewRendererProps } from "./DetailViewRenderer";
import type { DashboardViewRendererProps } from "./DashboardViewRenderer";
import type { KanbanViewRendererProps } from "./KanbanViewRenderer";
import type { CalendarViewRendererProps } from "./CalendarViewRenderer";
import type { ChartViewRendererProps } from "./ChartViewRenderer";
import type { TimelineViewRendererProps } from "./TimelineViewRenderer";
import type { MapViewRendererProps } from "./MapViewRenderer";
import type { ViewType } from "./types";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded renderers (route-level code splitting)                  */
/* ------------------------------------------------------------------ */

const LazyDashboard = React.lazy(() =>
  import("./DashboardViewRenderer").then((m) => ({ default: m.DashboardViewRenderer })),
);
const LazyKanban = React.lazy(() =>
  import("./KanbanViewRenderer").then((m) => ({ default: m.KanbanViewRenderer })),
);
const LazyCalendar = React.lazy(() =>
  import("./CalendarViewRenderer").then((m) => ({ default: m.CalendarViewRenderer })),
);
const LazyChart = React.lazy(() =>
  import("./ChartViewRenderer").then((m) => ({ default: m.ChartViewRenderer })),
);
const LazyTimeline = React.lazy(() =>
  import("./TimelineViewRenderer").then((m) => ({ default: m.TimelineViewRenderer })),
);
const LazyMap = React.lazy(() =>
  import("./MapViewRenderer").then((m) => ({ default: m.MapViewRenderer })),
);

/* ------------------------------------------------------------------ */
/*  Loading fallback                                                    */
/* ------------------------------------------------------------------ */

function RendererFallback() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#1e40af" />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maps a view type string to the corresponding renderer component.
 *
 * The registry is intentionally open-ended so that future view types
 * can be registered by higher-level code without modifying this file.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rendererMap: Record<string, React.ComponentType<any>> = {
  list: ListViewRenderer,
  form: FormViewRenderer,
  detail: DetailViewRenderer,
  dashboard: LazyDashboard,
  kanban: LazyKanban,
  calendar: LazyCalendar,
  chart: LazyChart,
  timeline: LazyTimeline,
  map: LazyMap,
};

/**
 * Register a custom view-type renderer at runtime.
 * Use this to add kanban, calendar, or other renderers.
 */
export function registerRenderer(
  viewType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>,
) {
  rendererMap[viewType] = component;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ViewRendererProps {
  /** The type of view to render */
  viewType: ViewType | string;
  /** Props forwarded to the resolved renderer */
  props:
    | ListViewRendererProps
    | FormViewRendererProps
    | DetailViewRendererProps
    | DashboardViewRendererProps
    | KanbanViewRendererProps
    | CalendarViewRendererProps
    | ChartViewRendererProps
    | TimelineViewRendererProps
    | MapViewRendererProps
    | Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Top-level dispatcher that routes to the correct view-type renderer.
 *
 * Usage:
 * ```tsx
 * <ViewRenderer viewType="list" props={{ records, fields, view, ... }} />
 * ```
 */
export function ViewRenderer({ viewType, props }: ViewRendererProps) {
  const Renderer = rendererMap[viewType];

  if (!Renderer) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-muted-foreground">
          Unsupported view type: {viewType}
        </Text>
      </View>
    );
  }

  return (
    <Suspense fallback={<RendererFallback />}>
      <Renderer {...props} />
    </Suspense>
  );
}
