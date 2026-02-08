import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Plus, Trash2, ToggleLeft } from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { FieldDefinition } from "~/components/renderers/types";
import {
  type CompoundFilter,
  type SimpleFilter,
  type FilterOperator,
  isCompoundFilter,
  isSimpleFilter,
  OPERATOR_META,
  operatorsForFieldType,
} from "~/lib/query-builder";
import { FilterRow } from "./FilterRow";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface QueryBuilderProps {
  /** Root compound filter */
  root: CompoundFilter;
  /** Available field definitions for the dropdowns */
  fields: FieldDefinition[];
  /** Called when any filter node changes */
  onAddFilter: (field?: string, operator?: FilterOperator) => void;
  onUpdateFilter: (id: string, patch: Partial<SimpleFilter>) => void;
  onRemoveFilter: (id: string) => void;
  onToggleLogic: () => void;
  onClear: () => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function QueryBuilder({
  root,
  fields,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onToggleLogic,
  onClear,
  className,
}: QueryBuilderProps) {
  const handleAdd = useCallback(() => {
    const firstField = fields[0]?.name ?? "";
    onAddFilter(firstField, "eq");
  }, [fields, onAddFilter]);

  return (
    <View className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          onPress={onToggleLogic}
          className="flex-row items-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5"
        >
          <ToggleLeft size={14} color="#1e40af" />
          <Text className="ml-1.5 text-xs font-semibold text-primary">
            Match {root.logic === "AND" ? "ALL" : "ANY"}
          </Text>
        </Pressable>

        {root.filters.length > 0 && (
          <Pressable onPress={onClear} className="flex-row items-center rounded-lg px-2 py-1">
            <Trash2 size={14} color="#ef4444" />
            <Text className="ml-1 text-xs text-destructive">Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Filter rows */}
      <ScrollView className="max-h-64">
        {root.filters.map((node, index) => {
          if (isSimpleFilter(node)) {
            return (
              <FilterRow
                key={node.id}
                filter={node}
                fields={fields}
                onUpdate={(patch) => onUpdateFilter(node.id, patch)}
                onRemove={() => onRemoveFilter(node.id)}
              />
            );
          }
          // Nested compound groups could be rendered recursively here.
          // For the initial release we keep it flat.
          return null;
        })}
      </ScrollView>

      {/* Add filter button */}
      <Pressable
        onPress={handleAdd}
        className="mt-3 flex-row items-center self-start rounded-lg border border-dashed border-border px-3 py-2"
      >
        <Plus size={14} color="#64748b" />
        <Text className="ml-1.5 text-xs font-medium text-muted-foreground">Add filter</Text>
      </Pressable>
    </View>
  );
}
