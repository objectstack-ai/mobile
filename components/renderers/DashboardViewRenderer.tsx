import React from "react";
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  List,
  Hash,
  Activity,
} from "lucide-react-native";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import type { DashboardMeta, DashboardWidgetMeta } from "./types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface DashboardViewRendererProps {
  /** Dashboard metadata */
  dashboard?: DashboardMeta | null;
  /** Widget data, keyed by widget name */
  widgetData?: Record<string, WidgetDataPayload>;
  /** Loading */
  isLoading?: boolean;
  /** Widget press handler */
  onWidgetPress?: (widget: DashboardWidgetMeta) => void;
}

export interface WidgetDataPayload {
  value?: number | string;
  records?: Record<string, unknown>[];
  trend?: string;
  label?: string;
  isLoading?: boolean;
  /** Analytics chart data points (from useAnalyticsQuery) */
  chartData?: Array<{ label: string; value: number; [key: string]: unknown }>;
}

/* ------------------------------------------------------------------ */
/*  Widget renderers                                                   */
/* ------------------------------------------------------------------ */

function MetricWidget({
  widget,
  data,
}: {
  widget: DashboardWidgetMeta;
  data?: WidgetDataPayload;
}) {
  const value = data?.value ?? "—";
  const trend = data?.trend;
  const isPositive = trend?.startsWith("+");

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <Hash size={18} color="#1e40af" />
        </View>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Text className="text-2xl font-bold text-card-foreground">
              {String(value)}
            </Text>
            {trend && (
              <View className="mt-2 flex-row items-center">
                <View
                  className={`flex-row items-center rounded-full px-2.5 py-1 ${
                    isPositive ? "bg-emerald-50" : "bg-red-50"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp size={12} color="#059669" />
                  ) : (
                    <TrendingDown size={12} color="#dc2626" />
                  )}
                  <Text
                    className={`ml-1 text-xs font-semibold ${
                      isPositive ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {trend}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CardWidget({
  widget,
  data,
}: {
  widget: DashboardWidgetMeta;
  data?: WidgetDataPayload;
}) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text className="text-base text-card-foreground">
            {data?.value != null ? String(data.value) : data?.label ?? "—"}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

function ListWidget({
  widget,
  data,
}: {
  widget: DashboardWidgetMeta;
  data?: WidgetDataPayload;
}) {
  const records = data?.records ?? [];

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <List size={18} color="#1e40af" />
        </View>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : records.length === 0 ? (
          <Text className="text-sm text-muted-foreground">No data</Text>
        ) : (
          <View className="gap-2">
            {records.slice(0, 5).map((rec, idx) => {
              const label =
                (rec.name as string) ??
                (rec.label as string) ??
                (rec.title as string) ??
                `Item ${idx + 1}`;
              const valueField = widget.valueField;
              const val = valueField ? rec[valueField] : null;
              return (
                <View
                  key={(rec.id as string) ?? idx}
                  className="flex-row items-center justify-between"
                >
                  <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                    {String(label)}
                  </Text>
                  {val != null && (
                    <Text className="text-sm font-medium text-foreground">
                      {String(val)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

function ChartWidget({
  widget,
  data,
}: {
  widget: DashboardWidgetMeta;
  data?: WidgetDataPayload;
}) {
  const chartType = String(widget.chartConfig?.type ?? widget.type ?? "bar");

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <BarChart3 size={18} color="#1e40af" />
        </View>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : data?.chartData && data.chartData.length > 0 ? (
          /* Render inline mini-chart from analytics data */
          <View className="gap-1 py-2">
            {data.chartData.slice(0, 6).map((point: any, idx: number) => {
              const maxVal = Math.max(
                ...data.chartData!.map((p: any) => Number(p.value) || 0),
                1,
              );
              const pct = Math.max(((Number(point.value) || 0) / maxVal) * 100, 4);
              return (
                <View key={point.label ?? idx} className="flex-row items-center gap-2">
                  <Text className="w-16 text-[10px] text-muted-foreground" numberOfLines={1}>
                    {point.label}
                  </Text>
                  <View className="flex-1 h-4 rounded-sm bg-muted/40">
                    <View
                      className="h-4 rounded-sm bg-primary/70"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </View>
                  <Text className="w-10 text-right text-[10px] font-medium text-foreground">
                    {String(point.value)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="items-center justify-center py-8">
            <BarChart3 size={48} color="#94a3b8" />
            <Text className="mt-3 text-sm text-muted-foreground">
              Chart: {chartType}
            </Text>
            {data?.value != null && (
              <Text className="mt-1 text-lg font-bold text-foreground">
                {String(data.value)}
              </Text>
            )}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Widget dispatcher                                                  */
/* ------------------------------------------------------------------ */

function renderWidget(
  widget: DashboardWidgetMeta,
  data?: WidgetDataPayload,
) {
  const type = widget.type ?? "metric";

  switch (type) {
    case "metric":
    case "kpi":
      return <MetricWidget widget={widget} data={data} />;

    case "card":
      return <CardWidget widget={widget} data={data} />;

    case "list":
    case "table":
      return <ListWidget widget={widget} data={data} />;

    default:
      // All chart types
      return <ChartWidget widget={widget} data={data} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/** Breakpoint (dp) at which the dashboard switches to 2-column grid */
const GRID_BREAKPOINT = 600;
/** Gap between grid cells in pixels */
const GRID_GAP = 12;

export function DashboardViewRenderer({
  dashboard,
  widgetData = {},
  isLoading = false,
  onWidgetPress,
}: DashboardViewRendererProps) {
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= GRID_BREAKPOINT ? 2 : 1;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (!dashboard || !dashboard.widgets || dashboard.widgets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Activity size={48} color="#94a3b8" />
        <Text className="mt-4 text-lg font-semibold text-foreground">No Dashboard</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          No dashboard widgets have been configured.
        </Text>
      </View>
    );
  }

  /* ---- Responsive grid layout ---- */
  const contentPadding = 16;
  const availableWidth = screenWidth - contentPadding * 2;
  const columnWidth =
    numColumns === 1
      ? availableWidth
      : (availableWidth - GRID_GAP) / numColumns;

  /** Build rows of widgets respecting span hints */
  const rows: DashboardWidgetMeta[][] = [];
  let currentRow: DashboardWidgetMeta[] = [];
  let currentSpan = 0;

  for (const widget of dashboard.widgets) {
    // A widget can declare span: 2 to take the full width
    const span = Math.min(widget.span ?? 1, numColumns);

    if (currentSpan + span > numColumns && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentSpan = 0;
    }
    currentRow.push(widget);
    currentSpan += span;
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: contentPadding,
        paddingBottom: 32,
        paddingTop: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Dashboard header */}
      {dashboard.label && (
        <View className="mb-4">
          <Text className="text-xl font-bold text-foreground">{dashboard.label}</Text>
          {dashboard.description && (
            <Text className="mt-1 text-sm text-muted-foreground">
              {dashboard.description}
            </Text>
          )}
        </View>
      )}

      {/* Widget grid */}
      {rows.map((row, rowIdx) => (
        <View
          key={`row-${rowIdx}`}
          style={{
            flexDirection: "row",
            marginBottom: GRID_GAP,
            gap: GRID_GAP,
          }}
        >
          {row.map((widget) => {
            const span = Math.min(widget.span ?? 1, numColumns);
            const widgetWidth =
              numColumns === 1
                ? availableWidth
                : columnWidth * span + GRID_GAP * (span - 1);

            return (
              <View key={widget.name} style={{ width: widgetWidth }}>
                {renderWidget(widget, widgetData[widget.name])}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}
