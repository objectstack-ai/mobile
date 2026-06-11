import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";
import { webContentMaxWidth } from "~/lib/responsive";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Layers,
  Search as SearchIcon,
  AlertCircle,
} from "lucide-react-native";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/common/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { Button } from "~/components/ui/Button";
import { BottomSheet } from "~/components/ui/BottomSheet";
import { SearchBar } from "~/components/common/SearchBar";
import { BatchActionBar } from "~/components/batch/BatchActionBar";
import { useUIStore } from "~/stores/ui-store";
import { formatDisplayValue, isSelectType, OptionBadge } from "./fields/FieldRenderer";
import { FilterDrawer, FilterButton } from "./FilterDrawer";
import { SwipeableRow } from "./SwipeableRow";
import type {
  ListColumn,
  ListViewMeta,
  FieldDefinition,
  FieldType,
  ColumnSummary,
  RowHeight,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Spec-aligned display helpers                                       */
/* ------------------------------------------------------------------ */

/** Card vertical padding per spec `RowHeight` (density). Defaults to `medium`. */
const ROW_DENSITY_PADDING: Record<RowHeight, string> = {
  compact: "py-2",
  short: "py-2.5",
  medium: "py-4",
  tall: "py-5",
  extra_tall: "py-7",
};

function rowDensityClass(rowHeight?: RowHeight): string {
  return ROW_DENSITY_PADDING[rowHeight ?? "medium"] ?? "py-4";
}

/** Stable display label for a (possibly absent) grouping/colour value. */
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

/* ---- Grouped list model ---- */

export type GroupHeaderItem = { __kind: "group"; label: string; count: number };
export type RecordRowItem = { __kind: "row"; record: Record<string, unknown> };
export type ListItem = GroupHeaderItem | RecordRowItem;

export function isGroupHeader(item: ListItem): item is GroupHeaderItem {
  return item.__kind === "group";
}

/**
 * Flatten records into a render list, inserting group-header sentinels when a
 * grouping field is in effect. Only the first grouping field is honoured here;
 * deeper nesting is a later phase.
 *
 * `groupFieldOverride` lets the user's in-session group-by choice take
 * precedence over the view's configured grouping: pass a field name to group by
 * it, `null` to force a flat list, or omit it (`undefined`) to fall back to
 * `meta.grouping`.
 *
 * Exported for unit testing.
 */
export function buildListItems(
  data: Record<string, unknown>[],
  meta: ListViewMeta | null | undefined,
  groupFieldOverride?: string | null,
  fields?: FieldDefinition[],
): ListItem[] {
  const groupField =
    groupFieldOverride !== undefined
      ? (groupFieldOverride ?? undefined)
      : meta?.grouping?.fields?.[0]?.field;
  if (!groupField) {
    return data.map((record) => ({ __kind: "row", record }));
  }

  // Bucket by the raw value (stable key), but remember the value itself so the
  // header can display the field's option *label* — e.g. a `status` group reads
  // "Completed", not "completed".
  const groupFieldDef = fields?.find((f) => f.name === groupField);
  const buckets = new Map<string, { value: unknown; records: Record<string, unknown>[] }>();
  for (const record of data) {
    const value = record[groupField];
    const key = groupValueLabel(value);
    const bucket = buckets.get(key);
    if (bucket) bucket.records.push(record);
    else buckets.set(key, { value, records: [record] });
  }

  const items: ListItem[] = [];
  for (const [key, { value, records }] of buckets) {
    // Map the raw value to its display label via the field definition (select →
    // option label, boolean → Yes/No, date → formatted); fall back to the key.
    const label =
      value == null || value === ""
        ? key
        : groupFieldDef
          ? formatDisplayValue(value, groupFieldDef.type, groupFieldDef)
          : key;
    items.push({ __kind: "group", label, count: records.length });
    for (const record of records) items.push({ __kind: "row", record });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ListViewRendererProps {
  /** ListView metadata from the server */
  view?: ListViewMeta | null;
  /** Field definitions for the parent object */
  fields?: FieldDefinition[];
  /** Data records */
  records: Record<string, unknown>[];
  /** Loading indicator */
  isLoading?: boolean;
  /** Error */
  error?: Error | null;
  /** Pull-to-refresh callback */
  onRefresh?: () => void | Promise<void>;
  /** Load more (infinite scroll) */
  onLoadMore?: () => void;
  /** Has more pages */
  hasMore?: boolean;
  /** Row press handler */
  onRowPress?: (record: Record<string, unknown>) => void;
  /** Sort change handler */
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  /** Search query change */
  onSearchChange?: (query: string) => void;
  /** Show search bar */
  showSearch?: boolean;
  /** Filter change handler */
  onFilterChange?: (filter: unknown) => void;
  /** Show filter button (requires fields) */
  showFilter?: boolean;
  /** Swipe edit handler — called with the record */
  onSwipeEdit?: (record: Record<string, unknown>) => void;
  /** Swipe delete handler — called with the record */
  onSwipeDelete?: (record: Record<string, unknown>) => void;
  /** Enable row selection mode */
  selectionMode?: "none" | "single" | "multiple";
  /** Currently selected record IDs (controlled) */
  selectedIds?: Set<string>;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Batch delete handler (shown in batch action bar) */
  onBatchDelete?: (ids: string[]) => void;
  /** Batch edit handler (shown in batch action bar) */
  onBatchEdit?: (ids: string[]) => void;
  /** Permission: hide create button when false */
  allowCreate?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ListViewRenderer({
  view,
  fields = [],
  records,
  isLoading = false,
  error,
  onRefresh,
  onLoadMore,
  hasMore = false,
  onRowPress,
  onSortChange,
  onSearchChange,
  showSearch = false,
  onFilterChange,
  showFilter = false,
  onSwipeEdit,
  onSwipeDelete,
  selectionMode: selectionModeProp,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  onBatchDelete,
  onBatchEdit,
}: ListViewRendererProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const accent = isDark ? "#60a5fa" : "#1e40af";

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  // Group-by override: `undefined` defers to the view's configured grouping,
  // `null` forces a flat list, a string groups by that field.
  const [groupOverride, setGroupOverride] = useState<string | null | undefined>(
    undefined,
  );
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);

  /* ---- Selection state ---- */
  const selectionMode = selectionModeProp ?? view?.selection?.type ?? "none";
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedIds = useCallback(
    (next: Set<string>) => {
      if (onSelectionChange) {
        onSelectionChange(next);
      } else {
        setInternalSelectedIds(next);
      }
    },
    [onSelectionChange],
  );

  const toggleSelection = useCallback(
    (recordId: string) => {
      const next = new Set(selectedIds);
      if (selectionMode === "single") {
        if (next.has(recordId)) {
          next.delete(recordId);
        } else {
          next.clear();
          next.add(recordId);
        }
      } else {
        if (next.has(recordId)) {
          next.delete(recordId);
        } else {
          next.add(recordId);
        }
      }
      setSelectedIds(next);
    },
    [selectedIds, selectionMode, setSelectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, [setSelectedIds]);

  /* ---- Resolve columns ---- */
  const columns: ListColumn[] = useMemo(() => {
    if (view?.columns && view.columns.length > 0) {
      return view.columns.map((col) => {
        if (typeof col === "string") {
          const fieldDef = fields.find((f) => f.name === col);
          return {
            field: col,
            label: fieldDef?.label ?? col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            sortable: true,
            type: fieldDef?.type,
          };
        }
        return col;
      });
    }

    // Fallback: derive columns from field definitions when the object has no
    // list view. Audit/system fields (created_at, created_by, …) lead the meta
    // `fields` map, so a naive `.slice(0, 5)` would surface only those. Instead
    // drop system/internal fields and lead with a human-recognizable label
    // field (name/title/subject/…) so the card's primary line is meaningful.
    if (fields.length > 0) {
      const PRIMARY_FIELD_NAMES = ["name", "label", "title", "subject", "full_name"];
      const isSystemField = (f: FieldDefinition) =>
        f.system === true ||
        f.name.startsWith("_") ||
        f.name === "id" ||
        ["created_at", "created_by", "updated_at", "updated_by"].includes(f.name);

      const businessFields = fields.filter((f) => !isSystemField(f));
      const primary = businessFields.filter((f) =>
        PRIMARY_FIELD_NAMES.includes(f.name.toLowerCase()),
      );
      const rest = businessFields.filter(
        (f) => !PRIMARY_FIELD_NAMES.includes(f.name.toLowerCase()),
      );
      const ordered = [...primary, ...rest];
      // If everything was a system field, fall back to the raw list so we still
      // render *something* rather than an empty table.
      const source = ordered.length > 0 ? ordered : fields;

      return source.slice(0, 5).map((f) => ({
        field: f.name,
        label: f.label ?? f.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        sortable: true,
        type: f.type,
      }));
    }

    if (records.length > 0) {
      return Object.keys(records[0])
        .filter((k) => !k.startsWith("_") && k !== "id")
        .slice(0, 5)
        .map((k) => ({
          field: k,
          label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          sortable: true,
        }));
    }

    return [];
  }, [view, fields, records]);

  /* ---- Grouping (view default, overridable in-session) ---- */
  const effectiveGroupField =
    groupOverride !== undefined
      ? groupOverride
      : (view?.grouping?.fields?.[0]?.field ?? null);

  /* ---- Spec-aligned display options ---- */
  const listItems = useMemo(
    () => buildListItems(records, view, effectiveGroupField, fields),
    [records, view, effectiveGroupField, fields],
  );
  // A view's explicit rowHeight wins; otherwise fall back to the user's global
  // density preference (comfortable → medium, compact → tighter rows).
  const userDensity = useUIStore((s) => s.density);
  const densityClass = rowDensityClass(
    view?.rowHeight ?? (userDensity === "compact" ? "compact" : "medium"),
  );
  const striped = !!view?.striped;
  const bordered = view?.bordered !== false;
  const summaryColumns = useMemo(
    () => columns.filter((c) => c.summary && c.summary !== "none"),
    [columns],
  );
  const sortableColumns = useMemo(
    () => columns.filter((c) => c.sortable !== false && !c.hidden),
    [columns],
  );

  /** Resolve a record's background colour from spec `rowColor`, if configured. */
  const rowBackground = useCallback(
    (record: Record<string, unknown>): string | undefined => {
      const rc = view?.rowColor;
      if (!rc?.field || !rc.colors) return undefined;
      return rc.colors[groupValueLabel(record[rc.field])];
    },
    [view?.rowColor],
  );

  /* ---- Handlers ---- */
  const handleSort = useCallback(
    (field: string) => {
      const newDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
      setSortField(field);
      setSortDir(newDir);
      onSortChange?.(field, newDir);
    },
    [sortField, sortDir, onSortChange],
  );

  /* ---- Render a single record card ---- */
  const renderRecordCard = useCallback(
    (item: Record<string, unknown>, index: number) => {
      const recordId = String(item.id ?? item._id ?? "");
      const isSelected = selectedIds.has(recordId);
      const primaryCol = columns[0];
      // Show the first two *populated* secondary fields rather than fixed
      // columns 1–2: a fallback like `name, account, contact, …` otherwise
      // wastes a card line on an always-empty field (e.g. "Contact: —"). Widen
      // the candidate window and skip blanks so meaningful data (amount, stage)
      // surfaces instead.
      const secondaryCols = columns
        .slice(1, 5)
        .filter((col) => {
          const v = item[col.field];
          return v !== null && v !== undefined && v !== "";
        })
        .slice(0, 2);

      const primaryValue = primaryCol
        ? String(item[primaryCol.field] ?? "")
        : item.name ?? item.label ?? item.title ?? item.subject ?? item.id ?? "Record";

      const customBg = rowBackground(item);
      const stripedBg = striped && index % 2 === 1;

      const rowContent = (
        <Pressable
          // Cap + center each row on wide web so the list reads as a column,
          // not edge-to-edge (no-op on native). Per-row keeps FlashList's
          // virtualization intact — its contentContainerStyle is padding-only.
          style={[webContentMaxWidth, customBg ? { backgroundColor: customBg } : null]}
          className={cn(
            "mb-2 rounded-xl px-4 active:bg-muted/50",
            densityClass,
            bordered ? "border" : "",
            isSelected
              ? "border-primary bg-primary/5"
              : customBg
                ? "border-border"
                : stripedBg
                  ? "border-border bg-muted/30"
                  : "border-border bg-card",
          )}
          onPress={() => {
            if (selectionMode !== "none") {
              toggleSelection(recordId);
            } else {
              onRowPress?.(item);
            }
          }}
          onLongPress={
            selectionMode === "multiple"
              ? () => toggleSelection(recordId)
              : undefined
          }
        >
          <View className="flex-row items-center">
            {/* Selection checkbox */}
            {selectionMode !== "none" && (
              <Pressable
                className={cn(
                  "mr-3 h-5 w-5 items-center justify-center rounded border",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40",
                )}
                onPress={() => toggleSelection(recordId)}
              >
                {isSelected && <Check size={14} color="#ffffff" />}
              </Pressable>
            )}

            <View className="flex-1">
              <Text className="text-base font-medium text-card-foreground" numberOfLines={1}>
                {String(primaryValue)}
              </Text>
              {secondaryCols.length > 0 && (
                <View className="mt-1.5 flex-row flex-wrap gap-x-4">
                  {secondaryCols.map((col) => {
                    const fieldDef = fields.find((f) => f.name === col.field);
                    const fieldType = (fieldDef?.type ?? col.type ?? "text") as FieldType;
                    // Select/status values render as the option's coloured badge
                    // (the colour carries the meaning), not flat "Label: value".
                    if (isSelectType(fieldType)) {
                      return (
                        <OptionBadge
                          key={col.field}
                          field={{ ...fieldDef, name: col.field, type: fieldType }}
                          value={item[col.field]}
                        />
                      );
                    }
                    const displayVal = formatDisplayValue(item[col.field], fieldType, fieldDef);
                    return (
                      <View key={col.field} className="flex-row items-center">
                        <Text className="text-xs text-muted-foreground">
                          {col.label ?? col.field}:{" "}
                        </Text>
                        <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
                          {displayVal}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );

      /* Wrap in SwipeableRow when swipe actions are available */
      if (onSwipeEdit || onSwipeDelete) {
        return (
          <SwipeableRow
            onEdit={onSwipeEdit ? () => onSwipeEdit(item) : undefined}
            onDelete={onSwipeDelete ? () => onSwipeDelete(item) : undefined}
          >
            {rowContent}
          </SwipeableRow>
        );
      }

      return rowContent;
    },
    [
      columns,
      fields,
      densityClass,
      bordered,
      striped,
      rowBackground,
      onRowPress,
      onSwipeEdit,
      onSwipeDelete,
      selectedIds,
      selectionMode,
      toggleSelection,
    ],
  );

  /* ---- Render row (group header or record) ---- */
  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (isGroupHeader(item)) {
        return (
          <View className="mb-2 flex-row items-center px-1 pt-2">
            <Text className="text-xs font-semibold uppercase text-muted-foreground">
              {item.label}
            </Text>
            <Text className="ml-2 text-xs text-muted-foreground/60">({item.count})</Text>
          </View>
        );
      }
      return renderRecordCard(item.record, index);
    },
    [renderRecordCard],
  );

  /* ---- Search state ---- */
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      onSearchChange?.(text);
    },
    [onSearchChange],
  );

  /* ---- Filter handlers ---- */
  const handleFilterApply = useCallback(
    (filter: unknown) => {
      if (filter === null || filter === undefined) {
        setActiveFilterCount(0);
      } else if (Array.isArray(filter)) {
        // ObjectQL compound: ['and', f1, f2, …] → count child filters
        const logic = filter[0];
        const isLogic =
          typeof logic === "string" && /^(and|or)$/i.test(logic);
        setActiveFilterCount(isLogic ? filter.length - 1 : 1);
      } else {
        setActiveFilterCount(1);
      }
      onFilterChange?.(filter);
    },
    [onFilterChange],
  );

  /* ---- Summary footer (spec column `summary`) ---- */
  const summaryFooter =
    summaryColumns.length > 0 ? (
      <View className="mt-1 rounded-xl border border-border bg-muted/30 px-4 py-3">
        {summaryColumns.map((col) => (
          <View key={col.field} className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">
              {col.label ?? col.field} ({col.summary})
            </Text>
            <Text className="text-xs font-semibold text-foreground">
              {computeColumnSummary(records, col)}
            </Text>
          </View>
        ))}
      </View>
    ) : null;

  /* ---- Error state ---- */
  if (error && !isLoading) {
    return (
      <EmptyState
        icon={
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle size={40} color="#dc2626" />
          </View>
        }
        title={t("records.loadError")}
        description={error.message}
        action={
          onRefresh ? (
            <Button size="sm" onPress={() => void onRefresh()}>
              {t("common.retry")}
            </Button>
          ) : undefined
        }
      />
    );
  }

  /* ---- Main ---- */
  return (
    <View className="flex-1">
      {/* Search + Filter row */}
      {(showSearch || showFilter) && (
        <View className="flex-row items-center gap-2 px-4 pt-3">
          {showSearch && onSearchChange && (
            <View className="flex-1">
              <SearchBar
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder={t("records.searchRecords")}
              />
            </View>
          )}
          {showFilter && fields.length > 0 && (
            <FilterButton
              count={activeFilterCount}
              onPress={() => setFilterVisible(true)}
            />
          )}
        </View>
      )}

      {/* Record count (spec `showRecordCount`) */}
      {view?.showRecordCount && (
        <View className="px-4 pt-2">
          <Text className="text-xs text-muted-foreground">
            {records.length} {records.length === 1 ? "record" : "records"}
          </Text>
        </View>
      )}

      {/* Sort + group controls */}
      {sortableColumns.length > 0 && (
        <View className="flex-row flex-wrap items-center gap-2 px-4 pb-2 pt-3">
          {/* Group-by control */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !!effectiveGroupField }}
            accessibilityLabel={t("records.groupBy")}
            className={cn(
              "flex-row items-center rounded-full border px-3 py-1.5",
              effectiveGroupField
                ? "border-primary bg-primary/10"
                : "border-border bg-card",
            )}
            onPress={() => setGroupSheetOpen(true)}
          >
            <Layers size={13} color={effectiveGroupField ? accent : "#94a3b8"} />
            <Text
              className={cn(
                "ml-1.5 text-xs font-medium",
                effectiveGroupField ? "text-primary" : "text-muted-foreground",
              )}
            >
              {effectiveGroupField
                ? (columns.find((c) => c.field === effectiveGroupField)?.label ??
                  effectiveGroupField)
                : t("records.groupBy")}
            </Text>
          </Pressable>

          {/* Sort chips — active chip shows direction; the rest hint sortability */}
          {sortableColumns.slice(0, 4).map((col) => {
            const isActive = sortField === col.field;
            return (
              <Pressable
                key={col.field}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${t("records.sortBy")}: ${col.label ?? col.field}`}
                className={cn(
                  "flex-row items-center rounded-full border px-3 py-1.5",
                  isActive ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
                onPress={() => handleSort(col.field)}
              >
                <Text
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {col.label ?? col.field}
                </Text>
                <View className="ml-1">
                  {isActive ? (
                    sortDir === "asc" ? (
                      <ArrowUp size={12} color={accent} />
                    ) : (
                      <ArrowDown size={12} color={accent} />
                    )
                  ) : (
                    <ArrowUpDown size={12} color="#94a3b8" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* List */}
      <FlashList
        data={listItems}
        keyExtractor={(item: ListItem, index: number) =>
          isGroupHeader(item)
            ? `group:${item.label}:${index}`
            : String(item.record.id ?? item.record._id ?? index)
        }
        renderItem={renderItem}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={false} onRefresh={onRefresh} />
          ) : undefined
        }
        ListEmptyComponent={
          isLoading ? (
            <ListSkeleton count={6} />
          ) : (
            <EmptyState
              icon={
                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                  <SearchIcon size={40} color="#94a3b8" />
                </View>
              }
              title={t("records.noRecords")}
              description={t("records.noRecordsDescription")}
            />
          )
        }
        ListFooterComponent={
          <>
            {records.length > 0 ? summaryFooter : null}
            {isLoading && records.length > 0 ? (
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            ) : null}
          </>
        }
      />

      {/* Batch action bar */}
      {selectionMode !== "none" && selectedIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onBatchDelete={
            onBatchDelete
              ? () => onBatchDelete(Array.from(selectedIds))
              : undefined
          }
          onBatchEdit={
            onBatchEdit
              ? () => onBatchEdit(Array.from(selectedIds))
              : undefined
          }
        />
      )}

      {/* Filter drawer */}
      {showFilter && fields.length > 0 && (
        <FilterDrawer
          fields={fields}
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          onApply={handleFilterApply}
        />
      )}

      {/* Group-by picker */}
      <BottomSheet
        open={groupSheetOpen}
        onOpenChange={setGroupSheetOpen}
        title={t("records.groupBy")}
      >
        <View className="gap-0.5">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: !effectiveGroupField }}
            className="flex-row items-center justify-between rounded-lg px-3 py-3 active:bg-muted"
            onPress={() => {
              setGroupOverride(null);
              setGroupSheetOpen(false);
            }}
          >
            <Text
              className={cn(
                "text-base",
                effectiveGroupField ? "text-foreground" : "font-semibold text-primary",
              )}
            >
              {t("records.groupNone")}
            </Text>
            {!effectiveGroupField && <Check size={18} color={accent} />}
          </Pressable>
          {sortableColumns.map((col) => {
            const selected = effectiveGroupField === col.field;
            return (
              <Pressable
                key={col.field}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="flex-row items-center justify-between rounded-lg px-3 py-3 active:bg-muted"
                onPress={() => {
                  setGroupOverride(col.field);
                  setGroupSheetOpen(false);
                }}
              >
                <Text
                  className={cn(
                    "text-base",
                    selected ? "font-semibold text-primary" : "text-foreground",
                  )}
                >
                  {col.label ?? col.field}
                </Text>
                {selected && <Check size={18} color={accent} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}
