import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  ListColumn,
  ListViewMeta,
  FieldDefinition,
  ColumnSummary,
  RowHeight,
} from "./types";
import { FieldRenderer } from "./fields/FieldRenderer";
import { SwipeableRow } from "./SwipeableRow";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ListViewRendererProps {
  /** The list-view metadata (columns, selection, …) */
  meta: ListViewMeta;
  /** The records to display */
  data: Record<string, unknown>[];
  /** Field definitions for column type resolution */
  fieldDefs?: Record<string, FieldDefinition>;
  /** Whether data is loading */
  loading?: boolean;
  /** Pull-to-refresh handler */
  onRefresh?: () => void;
  /** Row press handler */
  onRowPress?: (record: Record<string, unknown>) => void;
  /** Selection-change handler */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Row action handler (swipe) */
  onRowAction?: (action: string, record: Record<string, unknown>) => void;
  /** Empty-state message */
  emptyMessage?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getColumnKey(col: string | ListColumn): string {
  return typeof col === "string" ? col : col.field;
}

function getColumnLabel(col: string | ListColumn): string {
  const key = getColumnKey(col);
  if (typeof col === "object" && col.label) return col.label;
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function getColumnField(col: string | ListColumn): ListColumn {
  return typeof col === "string" ? { field: col } : col;
}

function isFieldVisible(col: ListColumn): boolean {
  return !col.hidden;
}

/** Vertical padding per spec `RowHeight` (density). Defaults to `medium`. */
const ROW_DENSITY_PADDING: Record<RowHeight, string> = {
  compact: "py-1.5",
  short: "py-2",
  medium: "py-3",
  tall: "py-4",
  extra_tall: "py-6",
};

function rowPaddingClass(rowHeight?: RowHeight): string {
  return ROW_DENSITY_PADDING[rowHeight ?? "medium"] ?? "py-3";
}

/** Stable string key for a (possibly absent) grouping value. */
function groupValueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/**
 * Compute a spec `ColumnSummary` aggregation over the column's values.
 * Returns a display string, or `null` when the operator is `none`/absent.
 *
 * Exported for unit testing.
 */
export function computeColumnSummary(
  records: Record<string, unknown>[],
  col: ListColumn,
): string | null {
  const op: ColumnSummary | undefined = col.summary;
  if (!op || op === "none") return null;

  const values = records.map((r) => r[col.field]);
  const filled = values.filter((v) => v !== null && v !== undefined && v !== "");
  const empty = values.length - filled.length;
  const nums = filled
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => !Number.isNaN(n));

  const pct = (n: number) =>
    values.length === 0 ? "0%" : `${Math.round((n / values.length) * 100)}%`;

  switch (op) {
    case "count":
      return String(values.length);
    case "count_empty":
      return String(empty);
    case "count_filled":
      return String(filled.length);
    case "count_unique":
      return String(new Set(filled.map((v) => String(v))).size);
    case "percent_empty":
      return pct(empty);
    case "percent_filled":
      return pct(filled.length);
    case "sum":
      return nums.length ? String(nums.reduce((a, b) => a + b, 0)) : "—";
    case "avg":
      return nums.length
        ? String(
            Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) /
              100,
          )
        : "—";
    case "min":
      return nums.length ? String(Math.min(...nums)) : "—";
    case "max":
      return nums.length ? String(Math.max(...nums)) : "—";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Grouped list model                                                 */
/* ------------------------------------------------------------------ */

type GroupHeaderItem = { __kind: "group"; label: string; count: number };
type RecordItem = { __kind: "row"; record: Record<string, unknown> };
type ListItem = GroupHeaderItem | RecordItem;

function isGroupHeader(item: ListItem): item is GroupHeaderItem {
  return item.__kind === "group";
}

/**
 * Flatten records into a render list, inserting group-header sentinels when
 * `meta.grouping` is present. Only the first grouping field is honoured here;
 * deeper nesting is a later phase.
 *
 * Exported for unit testing.
 */
export function buildListItems(
  data: Record<string, unknown>[],
  meta: ListViewMeta,
): ListItem[] {
  const groupField = meta.grouping?.fields?.[0]?.field;
  if (!groupField) {
    return data.map((record) => ({ __kind: "row", record }));
  }

  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const record of data) {
    const key = groupValueLabel(record[groupField]);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(record);
    else buckets.set(key, [record]);
  }

  const items: ListItem[] = [];
  for (const [label, records] of buckets) {
    items.push({ __kind: "group", label, count: records.length });
    for (const record of records) items.push({ __kind: "row", record });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ListViewRenderer({
  meta,
  data,
  fieldDefs,
  loading,
  onRefresh,
  onRowPress,
  onSelectionChange,
  onRowAction,
  emptyMessage = "No records found",
}: ListViewRendererProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const columns = useMemo(() => {
    const cols = meta.columns ?? [];
    return cols.map(getColumnField).filter(isFieldVisible);
  }, [meta.columns]);

  const listItems = useMemo(() => buildListItems(data, meta), [data, meta]);

  const hasSummary = useMemo(
    () => columns.some((c) => c.summary && c.summary !== "none"),
    [columns],
  );

  const rowPad = rowPaddingClass(meta.rowHeight);

  const allSelected = data.length > 0 && selectedIds.size === data.length;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => String(r.id ?? r._id))));
    }
  }, [allSelected, data]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRowPress = useCallback(
    (record: Record<string, unknown>) => {
      onRowPress?.(record);
    },
    [onRowPress],
  );

  React.useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  /** Resolve a row's background colour from spec `rowColor`, if configured. */
  const rowBackground = useCallback(
    (record: Record<string, unknown>): string | undefined => {
      const rc = meta.rowColor;
      if (!rc?.field || !rc.colors) return undefined;
      const value = groupValueLabel(record[rc.field]);
      return rc.colors[value];
    },
    [meta.rowColor],
  );

  const selectionEnabled =
    !!meta.selection?.type && meta.selection.type !== "none";

  const cellClass = meta.bordered ? "flex-1 px-1 border-r border-gray-100" : "flex-1 px-1";

  const renderToolbar = () => {
    if (!meta.showRecordCount) return null;
    return (
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-1.5">
        <Text className="text-xs text-gray-500">{data.length} records</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View className="flex-row items-center border-b-2 border-gray-200 bg-gray-50 px-4 py-2">
      {selectionEnabled ? (
        <Pressable
          onPress={toggleSelectAll}
          className="mr-3 h-5 w-5 items-center justify-center rounded border border-gray-300"
        >
          {allSelected ? <Text className="text-blue-600">✓</Text> : null}
        </Pressable>
      ) : null}
      {columns.map((col) => (
        <View key={col.field} className={cellClass}>
          <Text className="text-xs font-semibold uppercase text-gray-500" numberOfLines={1}>
            {getColumnLabel(col)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderSummaryFooter = () => {
    if (!hasSummary) return null;
    return (
      <View className="flex-row items-center border-t-2 border-gray-200 bg-gray-50 px-4 py-2">
        {selectionEnabled ? <View className="mr-3 h-5 w-5" /> : null}
        {columns.map((col) => {
          const summary = computeColumnSummary(data, col);
          return (
            <View key={col.field} className={cellClass}>
              <Text className="text-xs font-semibold text-gray-700" numberOfLines={1}>
                {summary ?? ""}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderRow = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (isGroupHeader(item)) {
        return (
          <View className="flex-row items-center bg-gray-100 px-4 py-1.5">
            <Text className="text-xs font-semibold uppercase text-gray-600">
              {item.label}
            </Text>
            <Text className="ml-2 text-xs text-gray-400">({item.count})</Text>
          </View>
        );
      }

      const record = item.record;
      const rowId = String(record.id ?? record._id);
      const isSelected = selectedIds.has(rowId);
      const customBg = rowBackground(record);
      const striped = meta.striped && index % 2 === 1;

      const rowContent = (
        <Pressable
          onPress={() => handleRowPress(record)}
          style={customBg ? { backgroundColor: customBg } : undefined}
          className={`flex-row items-center border-b border-gray-100 px-4 ${rowPad} ${
            isSelected ? "bg-blue-50" : striped ? "bg-gray-50" : "bg-white"
          }`}
        >
          {selectionEnabled ? (
            <Pressable
              onPress={() => toggleSelect(rowId)}
              className="mr-3 h-5 w-5 items-center justify-center rounded border border-gray-300"
            >
              {isSelected ? <Text className="text-blue-600">✓</Text> : null}
            </Pressable>
          ) : null}
          {columns.map((col) => (
            <View key={col.field} className={cellClass}>
              <FieldRenderer
                field={resolveFieldDef(col, fieldDefs)}
                value={record[col.field]}
                mode="display"
                compact
              />
            </View>
          ))}
        </Pressable>
      );

      return onRowAction ? (
        <SwipeableRow onAction={(action) => onRowAction(action, record)}>
          {rowContent}
        </SwipeableRow>
      ) : (
        rowContent
      );
    },
    [
      columns,
      fieldDefs,
      selectedIds,
      selectionEnabled,
      rowPad,
      cellClass,
      meta.striped,
      rowBackground,
      handleRowPress,
      toggleSelect,
      onRowAction,
    ],
  );

  if (loading && data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <Text className="text-gray-400">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {renderToolbar()}
      {renderHeader()}
      <FlashList
        data={listItems}
        renderItem={renderRow}
        keyExtractor={(item, index) =>
          isGroupHeader(item)
            ? `group:${item.label}:${index}`
            : String(item.record.id ?? item.record._id ?? index)
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!loading} onRefresh={onRefresh} />
          ) : undefined
        }
        ListFooterComponent={
          <>
            {renderSummaryFooter()}
            <View className="h-4" />
          </>
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Field-definition resolver                                          */
/* ------------------------------------------------------------------ */

function resolveFieldDef(
  col: ListColumn,
  fieldDefs?: Record<string, FieldDefinition>,
): FieldDefinition {
  const base = fieldDefs?.[col.field];
  if (base) return base;
  return { name: col.field, type: (col.type as FieldDefinition["type"]) ?? "text" };
}
