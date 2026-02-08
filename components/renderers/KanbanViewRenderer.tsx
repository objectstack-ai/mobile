import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { GripVertical, Plus } from "lucide-react-native";
import type { FieldDefinition } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface KanbanColumn {
  /** Column value (matches the status/group field value) */
  value: string;
  /** Display label */
  label: string;
  /** Column color (hex) */
  color?: string;
}

export interface KanbanViewRendererProps {
  /** Records to display */
  records: Record<string, unknown>[];
  /** Field used to group records into columns (e.g. "status") */
  groupField: string;
  /** Column definitions — if omitted, derived from distinct field values */
  columns?: KanbanColumn[];
  /** Field definitions */
  fields?: FieldDefinition[];
  /** Loading */
  isLoading?: boolean;
  /** Card title field (default: "name") */
  titleField?: string;
  /** Card subtitle field */
  subtitleField?: string;
  /** Called when a card is pressed */
  onCardPress?: (record: Record<string, unknown>) => void;
  /** Called when a card is moved to a different column */
  onCardMove?: (recordId: string, newColumnValue: string) => void;
  /** Called when the add button is pressed on a column */
  onAddCard?: (columnValue: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Default column colours                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_COLUMN_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981",
  "#ef4444", "#ec4899", "#06b6d4", "#6366f1",
];

/* ------------------------------------------------------------------ */
/*  Kanban Card                                                        */
/* ------------------------------------------------------------------ */

function KanbanCard({
  record,
  titleField,
  subtitleField,
  onPress,
}: {
  record: Record<string, unknown>;
  titleField: string;
  subtitleField?: string;
  onPress?: () => void;
}) {
  const title = String(
    record[titleField] ?? record.name ?? record.title ?? record.label ?? record.id ?? "—",
  );
  const subtitle = subtitleField ? String(record[subtitleField] ?? "") : null;

  return (
    <Pressable
      className="mb-2 rounded-lg border border-border bg-card p-3 active:bg-muted/50"
      onPress={onPress}
    >
      <View className="flex-row items-start">
        <View className="mr-2 mt-1">
          <GripVertical size={14} color="#94a3b8" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-card-foreground" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban Column                                                      */
/* ------------------------------------------------------------------ */

function KanbanColumnView({
  column,
  records,
  titleField,
  subtitleField,
  onCardPress,
  onAddCard,
}: {
  column: KanbanColumn;
  records: Record<string, unknown>[];
  titleField: string;
  subtitleField?: string;
  onCardPress?: (record: Record<string, unknown>) => void;
  onAddCard?: () => void;
}) {
  return (
    <View className="mr-3 w-64 rounded-xl bg-muted/30 p-2">
      {/* Column header */}
      <View className="mb-2 flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <View
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: column.color ?? "#94a3b8" }}
          />
          <Text className="text-sm font-semibold text-foreground">{column.label}</Text>
          <View className="rounded-full bg-muted px-1.5 py-0.5">
            <Text className="text-[10px] font-medium text-muted-foreground">
              {records.length}
            </Text>
          </View>
        </View>
        {onAddCard && (
          <Pressable onPress={onAddCard} className="rounded-md p-1 active:bg-muted">
            <Plus size={14} color="#64748b" />
          </Pressable>
        )}
      </View>

      {/* Cards */}
      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id ?? item._id ?? Math.random())}
        renderItem={({ item }) => (
          <KanbanCard
            record={item}
            titleField={titleField}
            subtitleField={subtitleField}
            onPress={onCardPress ? () => onCardPress(item) : undefined}
          />
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="py-4 text-center text-xs text-muted-foreground">No items</Text>
        }
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Kanban board view renderer.
 *
 * Groups records into columns based on a status/group field and displays
 * them as draggable cards.  Uses horizontal ScrollView for column
 * navigation and FlatList for vertical card scrolling.
 */
export function KanbanViewRenderer({
  records,
  groupField,
  columns: columnsProp,
  fields,
  isLoading = false,
  titleField = "name",
  subtitleField,
  onCardPress,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCardMove: _onCardMove,
  onAddCard,
}: KanbanViewRendererProps) {
  /* ---- Derive columns ---- */
  const columns: KanbanColumn[] = useMemo(() => {
    if (columnsProp && columnsProp.length > 0) return columnsProp;

    // Derive from field options or distinct values
    const fieldDef = fields?.find((f) => f.name === groupField);
    if (fieldDef?.options) {
      return fieldDef.options.map((opt, idx) => ({
        value: opt.value,
        label: opt.label,
        color: DEFAULT_COLUMN_COLORS[idx % DEFAULT_COLUMN_COLORS.length],
      }));
    }

    // Derive from record values
    const values = [...new Set(records.map((r) => String(r[groupField] ?? "")))]
      .filter(Boolean);
    return values.map((v, idx) => ({
      value: v,
      label: v,
      color: DEFAULT_COLUMN_COLORS[idx % DEFAULT_COLUMN_COLORS.length],
    }));
  }, [columnsProp, records, groupField, fields]);

  /* ---- Group records by column ---- */
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};
    for (const col of columns) {
      map[col.value] = [];
    }
    for (const rec of records) {
      const val = String(rec[groupField] ?? "");
      if (map[val]) {
        map[val].push(rec);
      }
    }
    return map;
  }, [records, groupField, columns]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      className="flex-1"
    >
      {columns.map((col) => (
        <KanbanColumnView
          key={col.value}
          column={col}
          records={grouped[col.value] ?? []}
          titleField={titleField}
          subtitleField={subtitleField}
          onCardPress={onCardPress}
          onAddCard={onAddCard ? () => onAddCard(col.value) : undefined}
        />
      ))}
    </ScrollView>
  );
}
