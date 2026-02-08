import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { ChevronDown, ChevronUp, Search as SearchIcon } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/common/EmptyState";
import { SearchBar } from "~/components/common/SearchBar";
import { formatDisplayValue } from "./fields/FieldRenderer";
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
}: ListViewRendererProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
      const primaryCol = columns[0];
      const secondaryCols = columns.slice(1, 3);

      const primaryValue = primaryCol
        ? String(item[primaryCol.field] ?? "")
        : item.name ?? item.label ?? item.title ?? item.subject ?? item.id ?? "Record";

      return (
        <Pressable
          className="mb-2 rounded-xl border border-border bg-card p-4 active:bg-muted/50"
          onPress={() => onRowPress?.(item)}
        >
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
        </Pressable>
      );
    },
    [columns, fields, onRowPress],
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

  /* ---- Main ---- */
  return (
    <View className="flex-1">
      {/* Search */}
      {showSearch && onSearchChange && (
        <View className="px-4 pt-3">
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search records…"
          />
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
      <FlatList
        className="flex-1"
        data={records}
        keyExtractor={(item: any, index: number) =>
          item.id ?? item._id ?? String(index)
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
    </View>
  );
}
