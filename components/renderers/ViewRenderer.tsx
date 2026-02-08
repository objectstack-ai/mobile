import React from "react";
import { View, Text } from "react-native";
import { ListViewRenderer, type ListViewRendererProps } from "./ListViewRenderer";
import { FormViewRenderer, type FormViewRendererProps } from "./FormViewRenderer";
import { DetailViewRenderer, type DetailViewRendererProps } from "./DetailViewRenderer";
import {
  DashboardViewRenderer,
  type DashboardViewRendererProps,
} from "./DashboardViewRenderer";
import { KanbanViewRenderer, type KanbanViewRendererProps } from "./KanbanViewRenderer";
import { CalendarViewRenderer, type CalendarViewRendererProps } from "./CalendarViewRenderer";
import { ChartViewRenderer, type ChartViewRendererProps } from "./ChartViewRenderer";
import { TimelineViewRenderer, type TimelineViewRendererProps } from "./TimelineViewRenderer";
import { MapViewRenderer, type MapViewRendererProps } from "./MapViewRenderer";
import type { ViewType } from "./types";

/* ------------------------------------------------------------------ */
/*  Registry                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maps a view type string to the corresponding renderer component.
 *
 * The registry is intentionally open-ended so that future view types
 * can be registered by higher-level code without modifying this file.
 */
const rendererMap: Record<string, React.ComponentType<any>> = {
  list: ListViewRenderer,
  form: FormViewRenderer,
  detail: DetailViewRenderer,
  dashboard: DashboardViewRenderer,
  kanban: KanbanViewRenderer,
  calendar: CalendarViewRenderer,
  chart: ChartViewRenderer,
  timeline: TimelineViewRenderer,
  map: MapViewRenderer,
};

/**
 * Register a custom view-type renderer at runtime.
 * Use this to add kanban, calendar, or other renderers.
 */
export function registerRenderer(
  viewType: string,
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

  return <Renderer {...props} />;
}
