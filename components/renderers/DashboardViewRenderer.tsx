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
import { Skeleton } from "~/components/ui/Skeleton";
import { WidgetChart } from "./charts/WidgetChart";
import { useTranslation } from "react-i18next";
import { formatByPattern, formatCurrency, formatNumber } from "~/lib/formatting";
import { useThemeColors } from "~/lib/theme-colors";
import { AnimatedNumber } from "~/components/ui/AnimatedNumber";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { DashboardMeta, DashboardWidgetMeta } from "./types";

/** Skeleton grid shown while dashboard metadata + widget data load. */
function DashboardSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="mb-3">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/2 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

/** Value fields whose name implies a monetary amount (for metric formatting). */
const CURRENCY_FIELD_RE =
  /amount|revenue|price|cost|total|salary|value|deal|mrr|arr|budget|fee|balance/i;

/** Format a metric/KPI headline value using the widget's format hints. */
function formatMetricValue(
  widget: DashboardWidgetMeta,
  value: number | string | undefined,
): string {
  if (value == null) return "—";
  if (typeof value !== "number" || !isFinite(value)) return String(value);

  const pattern = (widget.chartConfig?.format as string | undefined) ?? undefined;
  if (pattern) return formatByPattern(value, pattern);

  if (CURRENCY_FIELD_RE.test(widget.valueField ?? "")) {
    return formatCurrency(value, { maximumFractionDigits: 0 });
  }
  return formatNumber(value, { maximumFractionDigits: 2 });
}

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
  const { accent } = useThemeColors();
  const value = data?.value ?? "—";
  const trend = data?.trend;
  const isPositive = trend?.startsWith("+");
  const isNumeric = typeof value === "number" && isFinite(value);

  // Compact tile (p-4, not p-5) — these pack two-up on phones, so the title
  // and headline must stay tight. Title is given a two-line floor so a
  // single-line tile lines its value up with a wrapping neighbor in the row.
  return (
    <Card className="mb-3 p-4">
      <View className="flex-row items-start justify-between">
        <Text
          className="min-h-[40px] flex-1 pe-2 text-sm font-medium text-muted-foreground"
          numberOfLines={2}
        >
          {widget.title ?? widget.name}
        </Text>
        <View className="rounded-lg bg-primary/10 p-1.5">
          <Hash size={16} color={accent} />
        </View>
      </View>
      {data?.isLoading ? (
        <ActivityIndicator size="small" className="mt-3 self-start" />
      ) : (
        <>
          {isNumeric ? (
            <AnimatedNumber
              value={value}
              format={(n) =>
                formatMetricValue(widget, Number.isInteger(value) ? Math.round(n) : n)
              }
              className="mt-1 text-2xl font-bold text-card-foreground"
              numberOfLines={1}
              adjustsFontSizeToFit
            />
          ) : (
            <Text
              className="mt-1 text-2xl font-bold text-card-foreground"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMetricValue(widget, value === "—" ? undefined : value)}
            </Text>
          )}
          {trend && (
            <View className="mt-2 flex-row">
              <View
                className={`flex-row items-center rounded-full px-2 py-0.5 ${
                  isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
                }`}
              >
                {isPositive ? (
                  <TrendingUp size={12} color="#059669" />
                ) : (
                  <TrendingDown size={12} color="#dc2626" />
                )}
                <Text
                  className={`ms-1 text-xs font-semibold ${
                    isPositive ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {trend}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
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
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const records = data?.records ?? [];

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <List size={18} color={accent} />
        </View>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : records.length === 0 ? (
          <Text className="text-sm text-muted-foreground">{t("empty.noData")}</Text>
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
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const chartType = String(widget.chartConfig?.type ?? widget.type ?? "bar");
  const colors = Array.isArray(widget.chartConfig?.colors)
    ? (widget.chartConfig?.colors as string[])
    : undefined;
  const formatPattern = widget.chartConfig?.format as string | undefined;
  const formatValue = (n: number) => formatByPattern(n, formatPattern);

  return (
    <Card className="mb-3">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {widget.title ?? widget.name}
        </CardTitle>
        <View className="rounded-lg bg-primary/10 p-2">
          <BarChart3 size={18} color={accent} />
        </View>
      </CardHeader>
      <CardContent>
        {data?.isLoading ? (
          <ActivityIndicator size="small" />
        ) : data?.chartData && data.chartData.length > 0 ? (
          <WidgetChart
            type={chartType}
            data={data.chartData.map((p) => ({ label: p.label, value: Number(p.value) || 0 }))}
            colors={colors}
            format={formatValue}
          />
        ) : (
          <View className="items-center justify-center py-8">
            <BarChart3 size={48} color="#94a3b8" />
            <Text className="mt-3 text-sm text-muted-foreground">
              {t("empty.noDataToChart")}
            </Text>
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

/** Minimum width (dp) below which the grid collapses to a single column. */
const SINGLE_COLUMN_MAX = 340;
/** Gap between grid cells in pixels */
const GRID_GAP = 12;

/** Widget types compact enough to pack two-per-row; the rest span full width. */
const COMPACT_TYPES = new Set(["metric", "kpi"]);

/**
 * How many columns a widget occupies. KPI/metric tiles are compact and pack
 * two-up; charts, lists and tables need the full row to stay legible on a
 * phone. An explicit `span` on a compact widget is still honored (capped to the
 * column count); the layout-derived span only matters for the full-width types,
 * which always fill the row regardless.
 */
function effectiveSpan(widget: DashboardWidgetMeta, numColumns: number): number {
  if (numColumns === 1) return 1;
  const type = widget.type ?? "metric";
  if (COMPACT_TYPES.has(type)) return Math.min(widget.span ?? 1, numColumns);
  return numColumns;
}

export function DashboardViewRenderer({
  dashboard,
  widgetData = {},
  isLoading = false,
  onWidgetPress: _onWidgetPress,
}: DashboardViewRendererProps) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth > SINGLE_COLUMN_MAX ? 2 : 1;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!dashboard || !dashboard.widgets || dashboard.widgets.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <Activity size={40} color="#94a3b8" />
        </View>
        <Text className="mt-5 text-lg font-semibold text-foreground">{t("empty.dashboardTitle")}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          {t("empty.dashboardDesc")}
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
    const span = effectiveSpan(widget, numColumns);

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

      {/* Widget grid — rows ease in with a gentle downward stagger. */}
      {rows.map((row, rowIdx) => (
        <Animated.View
          key={`row-${rowIdx}`}
          entering={FadeInDown.delay(rowIdx * 70).duration(380)}
          style={{
            flexDirection: "row",
            marginBottom: GRID_GAP,
            gap: GRID_GAP,
          }}
        >
          {row.map((widget) => {
            const span = effectiveSpan(widget, numColumns);
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
        </Animated.View>
      ))}
    </ScrollView>
  );
}
