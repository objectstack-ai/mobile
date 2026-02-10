import React, { useMemo } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { FileText } from "lucide-react-native";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/Card";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ReportType = "tabular" | "summary" | "matrix";

export interface ReportColumn {
  field: string;
  label?: string;
  aggregate?: "count" | "sum" | "avg" | "min" | "max";
  width?: number;
}

export interface ReportGrouping {
  field: string;
  label?: string;
  sortOrder?: "asc" | "desc";
}

export interface ReportRendererProps {
  /** Report title */
  title?: string;
  /** Report type */
  reportType?: ReportType;
  /** Column definitions */
  columns: ReportColumn[];
  /** Grouping definitions */
  groupings?: ReportGrouping[];
  /** Row data */
  data: Record<string, unknown>[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error */
  error?: Error | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function computeAggregate(
  rows: Record<string, unknown>[],
  field: string,
  aggregate: string,
): number {
  const values = rows
    .map((r) => r[field])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return 0;
  switch (aggregate) {
    case "count":
      return values.length;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.length;
  }
}

/* ------------------------------------------------------------------ */
/*  Tabular Report                                                     */
/* ------------------------------------------------------------------ */

function TabularReport({
  columns,
  data,
}: {
  columns: ReportColumn[];
  data: Record<string, unknown>[];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header row */}
        <View className="flex-row border-b border-border bg-muted/50 px-2 py-2">
          {columns.map((col) => (
            <View key={col.field} style={{ width: col.width ?? 120 }}>
              <Text className="text-xs font-semibold text-muted-foreground">
                {col.label ?? col.field}
              </Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        {data.map((row, idx) => (
          <View
            key={idx}
            className="flex-row border-b border-border/50 px-2 py-2"
          >
            {columns.map((col) => (
              <View key={col.field} style={{ width: col.width ?? 120 }}>
                <Text className="text-sm text-foreground">
                  {formatCellValue(row[col.field])}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* Aggregate footer */}
        {columns.some((c) => c.aggregate) && (
          <View className="flex-row border-t border-border bg-muted/30 px-2 py-2">
            {columns.map((col) => (
              <View key={col.field} style={{ width: col.width ?? 120 }}>
                {col.aggregate ? (
                  <Text className="text-xs font-bold text-primary">
                    {col.aggregate}: {computeAggregate(data, col.field, col.aggregate).toLocaleString()}
                  </Text>
                ) : (
                  <Text className="text-xs text-muted-foreground" />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Report                                                     */
/* ------------------------------------------------------------------ */

function SummaryReport({
  columns,
  groupings,
  data,
}: {
  columns: ReportColumn[];
  groupings: ReportGrouping[];
  data: Record<string, unknown>[];
}) {
  const groups = useMemo(() => {
    if (!groupings.length) return { "All": data };
    const groupField = groupings[0].field;
    const grouped: Record<string, Record<string, unknown>[]> = {};
    for (const row of data) {
      const key = String(row[groupField] ?? "Uncategorized");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    return grouped;
  }, [groupings, data]);

  const aggregateCols = columns.filter((c) => c.aggregate);

  return (
    <View className="gap-3">
      {Object.entries(groups).map(([groupLabel, rows]) => (
        <Card key={groupLabel}>
          <CardHeader>
            <CardTitle>{groupLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-xs text-muted-foreground mb-2">
              {rows.length} record{rows.length !== 1 ? "s" : ""}
            </Text>
            {aggregateCols.map((col) => (
              <View key={col.field} className="flex-row justify-between py-1">
                <Text className="text-sm text-foreground">
                  {col.label ?? col.field} ({col.aggregate})
                </Text>
                <Text className="text-sm font-semibold text-primary">
                  {computeAggregate(rows, col.field, col.aggregate!).toLocaleString()}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Matrix Report                                                      */
/* ------------------------------------------------------------------ */

function MatrixReport({
  columns,
  groupings,
  data,
}: {
  columns: ReportColumn[];
  groupings: ReportGrouping[];
  data: Record<string, unknown>[];
}) {
  const { rowGroups, colGroups, matrix } = useMemo(() => {
    const rowField = groupings[0]?.field ?? columns[0]?.field ?? "id";
    const colField = groupings[1]?.field ?? (columns[1]?.field ?? columns[0]?.field);
    const valueCol = columns.find((c) => c.aggregate) ?? columns[0];

    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cells: Record<string, Record<string, unknown>[]> = {};

    for (const row of data) {
      const rKey = String(row[rowField] ?? "—");
      const cKey = String(row[colField] ?? "—");
      rowSet.add(rKey);
      colSet.add(cKey);
      const cellKey = `${rKey}::${cKey}`;
      if (!cells[cellKey]) cells[cellKey] = [];
      cells[cellKey].push(row);
    }

    const matrixData: Record<string, Record<string, number>> = {};
    for (const rKey of rowSet) {
      matrixData[rKey] = {};
      for (const cKey of colSet) {
        const cellKey = `${rKey}::${cKey}`;
        const cellRows = cells[cellKey] ?? [];
        matrixData[rKey][cKey] = valueCol?.aggregate
          ? computeAggregate(cellRows, valueCol.field, valueCol.aggregate)
          : cellRows.length;
      }
    }

    return {
      rowGroups: Array.from(rowSet),
      colGroups: Array.from(colSet),
      matrix: matrixData,
    };
  }, [columns, groupings, data]);

  const cellWidth = 80;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header */}
        <View className="flex-row border-b border-border">
          <View style={{ width: 100 }} className="px-2 py-2">
            <Text className="text-xs font-semibold text-muted-foreground" />
          </View>
          {colGroups.map((col) => (
            <View key={col} style={{ width: cellWidth }} className="px-2 py-2">
              <Text className="text-xs font-semibold text-muted-foreground text-center">
                {col}
              </Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rowGroups.map((rowKey) => (
          <View key={rowKey} className="flex-row border-b border-border/50">
            <View style={{ width: 100 }} className="px-2 py-2">
              <Text className="text-xs font-medium text-foreground">
                {rowKey}
              </Text>
            </View>
            {colGroups.map((colKey) => (
              <View
                key={colKey}
                style={{ width: cellWidth }}
                className="px-2 py-2"
              >
                <Text className="text-sm text-center text-foreground">
                  {(matrix[rowKey]?.[colKey] ?? 0).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Renderer                                                      */
/* ------------------------------------------------------------------ */

/**
 * Report view renderer – renders tabular, summary, and matrix reports
 * from ReportSchema (spec/ui → ReportSchema).
 */
export function ReportRenderer({
  title,
  reportType = "tabular",
  columns,
  groupings = [],
  data,
  isLoading,
  error,
}: ReportRendererProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Text className="text-destructive text-center">{error.message}</Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <Text className="text-muted-foreground">No report data available</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <Card className="m-4">
        <CardHeader>
          <View className="flex-row items-center gap-2">
            <FileText size={18} color="#1e40af" />
            <CardTitle>{title ?? "Report"}</CardTitle>
          </View>
          <Text className="text-xs text-muted-foreground mt-1">
            {data.length} row{data.length !== 1 ? "s" : ""} · {reportType}
          </Text>
        </CardHeader>
        <CardContent>
          {reportType === "tabular" && (
            <TabularReport columns={columns} data={data} />
          )}
          {reportType === "summary" && (
            <SummaryReport
              columns={columns}
              groupings={groupings}
              data={data}
            />
          )}
          {reportType === "matrix" && (
            <MatrixReport
              columns={columns}
              groupings={groupings}
              data={data}
            />
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
