import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { ChevronDown, ChevronUp, Check, Search as SearchIcon } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/common/EmptyState";
import { SearchBar } from "~/components/common/SearchBar";
import { BatchActionBar } from "~/components/batch/BatchActionBar";
import { formatDisplayValue } from "./fields/FieldRenderer";
import { FilterDrawer, FilterButton } from "./FilterDrawer";
import { SwipeableRow } from "./SwipeableRow";
import type { ListColumn, ListViewMeta, FieldDefinition } from "./types";

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
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

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

    // Fallback: derive columns from first record or field definitions
    if (fields.length > 0) {
      return fields
        .filter((f) => !f.name.startsWith("_") && f.name !== "id")
        .slice(0, 5)
        .map((f) => ({
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

  /* ---- Render row ---- */
  const renderItem = useCallback(
    ({ item }: { item: Record<string, unknown> }) => {
      const recordId = String(item.id ?? item._id ?? "");
      const isSelected = selectedIds.has(recordId);
      const primaryCol = columns[0];
      const secondaryCols = columns.slice(1, 3);

      const primaryValue = primaryCol
        ? String(item[primaryCol.field] ?? "")
        : item.name ?? item.label ?? item.title ?? item.subject ?? item.id ?? "Record";

      const rowContent = (
        <Pressable
          className={cn(
            "mb-2 rounded-xl border bg-card p-4 active:bg-muted/50",
            isSelected ? "border-primary bg-primary/5" : "border-border",
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
                    const displayVal = formatDisplayValue(
                      item[col.field],
                      (fieldDef?.type ?? col.type ?? "text") as any,
                    );
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
    [columns, fields, onRowPress, onSwipeEdit, onSwipeDelete, selectedIds, selectionMode, toggleSelection],
  );

  /* ---- Error state ---- */
  if (error && !isLoading) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-destructive">{error.message}</Text>
        {onRefresh && (
          <Pressable
            className="mt-4 rounded-xl bg-primary px-5 py-3"
            onPress={onRefresh}
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

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
        // ObjectQL compound: ['AND', f1, f2, …] → count child filters
        const logic = filter[0];
        setActiveFilterCount(
          typeof logic === "string" && (logic === "AND" || logic === "OR")
            ? filter.length - 1
            : 1,
        );
      } else {
        setActiveFilterCount(1);
      }
      onFilterChange?.(filter);
    },
    [onFilterChange],
  );

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
                placeholder="Search records…"
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

      {/* Sort chips */}
      {columns.some((c) => c.sortable !== false) && (
        <View className="flex-row flex-wrap gap-2 px-4 pb-2 pt-3">
          {columns
            .filter((c) => c.sortable !== false && !c.hidden)
            .slice(0, 4)
            .map((col) => {
              const isActive = sortField === col.field;
              return (
                <Pressable
                  key={col.field}
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
                  {isActive &&
                    (sortDir === "asc" ? (
                      <ChevronUp size={12} color="#1e40af" className="ml-1" />
                    ) : (
                      <ChevronDown size={12} color="#1e40af" className="ml-1" />
                    ))}
                </Pressable>
              );
            })}
        </View>
      )}

      {/* List */}
      <FlashList
        data={records}
        keyExtractor={(item: any, index: number) =>
          item.id ?? item._id ?? String(index)
        }
        renderItem={renderItem}
        estimatedItemSize={80}
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
            <View className="items-center justify-center pt-20">
              <ActivityIndicator size="large" color="#1e40af" />
            </View>
          ) : (
            <EmptyState
              icon={<SearchIcon size={40} color="#94a3b8" />}
              title="No Records"
              description="No records found for this view."
            />
          )
        }
        ListFooterComponent={
          isLoading && records.length > 0 ? (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          ) : null
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
    </View>
  );
}
