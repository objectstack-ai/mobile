import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import { BarChart3, TrendingUp, PieChart, Activity, AlertCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "~/lib/theme-colors";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";
import { Skeleton } from "~/components/ui/Skeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import type { AnalyticsDataPoint } from "~/hooks/useAnalyticsQuery";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ChartType = "bar" | "line" | "pie" | "funnel";

export interface ChartViewRendererProps {
  /** Chart title */
  title?: string;
  /** Chart type */
  chartType?: ChartType;
  /** Data points to visualise */
  data: AnalyticsDataPoint[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error */
  error?: Error | null;
  /** Height of the chart area (default 220) */
  chartHeight?: number;
}

/* ------------------------------------------------------------------ */
/*  Chart icon helper                                                  */
/* ------------------------------------------------------------------ */

function ChartIcon({ type }: { type: ChartType }) {
  const { accent } = useThemeColors();
  switch (type) {
    case "line":
      return <TrendingUp size={18} color={accent} />;
    case "pie":
      return <PieChart size={18} color={accent} />;
    case "funnel":
      return <Activity size={18} color={accent} />;
    default:
      return <BarChart3 size={18} color={accent} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Bar chart (native)                                                 */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#ef4444", "#6366f1",
];

function BarChartView({ data, height }: { data: AnalyticsDataPoint[]; height: number }) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  return (
    <View style={{ height }} className="flex-row items-end justify-around px-2 pt-4">
      {data.map((point, idx) => {
        const barHeight = Math.max((point.value / maxValue) * (height - 40), 4);
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <View key={point.label ?? idx} className="items-center flex-1 mx-0.5">
            <Text className="mb-1 text-xs font-medium text-foreground" numberOfLines={1}>
              {point.value}
            </Text>
            <View
              style={{ height: barHeight, backgroundColor: color }}
              className="w-full max-w-[40px] rounded-t-md"
            />
            <Text className="mt-1 text-[10px] text-muted-foreground" numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Line chart (native)                                                */
/* ------------------------------------------------------------------ */

function LineChartView({ data, height }: { data: AnalyticsDataPoint[]; height: number }) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  return (
    <View style={{ height }} className="px-2 pt-4">
      {/* Y-axis labels */}
      <View className="flex-row items-end justify-around" style={{ height: height - 40 }}>
        {data.map((point, idx) => {
          const dotBottom = Math.max((point.value / maxValue) * (height - 60), 0);
          return (
            <View key={point.label ?? idx} className="items-center flex-1">
              <View style={{ flex: 1, justifyContent: "flex-end" }}>
                <View style={{ marginBottom: dotBottom }}>
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[0] }}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {/* X-axis labels */}
      <View className="flex-row justify-around mt-1">
        {data.map((point, idx) => (
          <Text
            key={point.label ?? idx}
            className="text-[10px] text-muted-foreground flex-1 text-center"
            numberOfLines={1}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie chart (native)                                                 */
/* ------------------------------------------------------------------ */

function PieChartView({ data }: { data: AnalyticsDataPoint[] }) {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0) || 1,
    [data],
  );

  return (
    <View className="gap-2 px-2 py-4">
      {data.map((point, idx) => {
        const pct = ((point.value / total) * 100).toFixed(1);
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <View key={point.label ?? idx} className="flex-row items-center gap-2">
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {point.label}
            </Text>
            <Text className="text-sm font-medium text-foreground">{point.value}</Text>
            <Text className="text-xs text-muted-foreground w-12 text-end">{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Funnel chart (native)                                              */
/* ------------------------------------------------------------------ */

function FunnelChartView({ data, height }: { data: AnalyticsDataPoint[]; height: number }) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  const barMaxWidth = 280;

  return (
    <View style={{ minHeight: height }} className="items-center justify-center gap-1 py-4 px-4">
      {data.map((point, idx) => {
        const width = Math.max((point.value / maxValue) * barMaxWidth, 40);
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return (
          <View key={point.label ?? idx} className="items-center">
            <View
              style={{ width, backgroundColor: color }}
              className="h-8 items-center justify-center rounded-md"
            >
              <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                {point.label}: {point.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart dispatcher                                                   */
/* ------------------------------------------------------------------ */

function renderChart(
  type: ChartType,
  data: AnalyticsDataPoint[],
  height: number,
  emptyLabel: string,
) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-12">
        <BarChart3 size={40} color="#94a3b8" />
        <Text className="mt-3 text-sm text-muted-foreground">{emptyLabel}</Text>
      </View>
    );
  }

  switch (type) {
    case "bar":
      return <BarChartView data={data} height={height} />;
    case "line":
      return <LineChartView data={data} height={height} />;
    case "pie":
      return <PieChartView data={data} />;
    case "funnel":
      return <FunnelChartView data={data} height={height} />;
    default:
      return <BarChartView data={data} height={height} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Chart view renderer supporting bar, line, pie, and funnel charts.
 *
 * Uses native React Native views (no SVG dependency) to render
 * lightweight, mobile-friendly visualizations.
 */
export function ChartViewRenderer({
  title,
  chartType = "bar",
  data,
  isLoading = false,
  error,
  chartHeight = 220,
}: ChartViewRendererProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <View
              style={{ height: chartHeight }}
              className="flex-row items-end justify-around px-2 pt-4"
            >
              {[0.5, 0.8, 0.4, 1, 0.65, 0.3].map((h, i) => (
                <View key={i} className="mx-0.5 flex-1 items-center justify-end">
                  <Skeleton
                    className="w-full max-w-[40px] rounded-t-md"
                    height={Math.max((chartHeight - 40) * h, 8)}
                  />
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        variant="error"
        title={t("empty.loadChart")}
        description={error.message}
      />
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title ?? "Chart"}
          </CardTitle>
          <View className="rounded-lg bg-primary/10 p-2">
            <ChartIcon type={chartType} />
          </View>
        </CardHeader>
        <CardContent>
          {renderChart(chartType, data, chartHeight, t("empty.noDataAvailable"))}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
