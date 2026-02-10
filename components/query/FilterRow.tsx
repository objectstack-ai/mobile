import React, { useMemo } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { X } from "lucide-react-native";
import type { FieldDefinition } from "~/components/renderers/types";
import {
  type SimpleFilter,
  OPERATOR_META,
  operatorsForFieldType,
} from "~/lib/query-builder";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface FilterRowProps {
  filter: SimpleFilter;
  fields: FieldDefinition[];
  onUpdate: (patch: Partial<SimpleFilter>) => void;
  onRemove: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function FilterRow({ filter, fields, onUpdate, onRemove }: FilterRowProps) {
  const selectedFieldDef = fields.find((f) => f.name === filter.field);
  const fieldType = selectedFieldDef?.type ?? "text";

  const availableOperators = useMemo(
    () => operatorsForFieldType(fieldType),
    [fieldType],
  );

  const operatorMeta = OPERATOR_META[filter.operator];
  const needsValue = operatorMeta?.valueCount !== 0;
  const needsSecondValue = operatorMeta?.valueCount === 2;

  return (
    <View className="mb-2 flex-row items-center gap-2">
      {/* Field picker (simplified as a scrollable row of chips) */}
      <Pressable
        className="flex-1 rounded-lg border border-input bg-background px-3 py-2"
        onPress={() => {
          // Cycle through fields for simplicity
          const currentIdx = fields.findIndex((f) => f.name === filter.field);
          const nextField = fields[(currentIdx + 1) % fields.length];
          if (nextField) {
            onUpdate({ field: nextField.name });
          }
        }}
      >
        <Text className="text-xs text-foreground" numberOfLines={1}>
          {selectedFieldDef?.label ?? (filter.field || "Field…")}
        </Text>
      </Pressable>

      {/* Operator picker */}
      <Pressable
        className="rounded-lg border border-input bg-background px-2 py-2"
        onPress={() => {
          const currentIdx = availableOperators.indexOf(filter.operator);
          const next = availableOperators[(currentIdx + 1) % availableOperators.length];
          if (next) onUpdate({ operator: next });
        }}
      >
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {operatorMeta?.label ?? filter.operator}
        </Text>
      </Pressable>

      {/* Value input */}
      {needsValue && (
        <TextInput
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
          value={String(filter.value ?? "")}
          onChangeText={(text) => onUpdate({ value: text })}
          placeholder="Value"
          placeholderTextColor="#94a3b8"
        />
      )}

      {/* Second value (between) */}
      {needsSecondValue && (
        <TextInput
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground"
          value={String(filter.value2 ?? "")}
          onChangeText={(text) => onUpdate({ value2: text } as Partial<SimpleFilter>)}
          placeholder="To"
          placeholderTextColor="#94a3b8"
        />
      )}

      {/* Remove */}
      <Pressable onPress={onRemove} className="p-1">
        <X size={16} color="#ef4444" />
      </Pressable>
    </View>
  );
}
