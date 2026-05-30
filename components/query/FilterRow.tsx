import React, { useMemo } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { X } from "lucide-react-native";
import type { FieldDefinition } from "~/components/renderers/types";
import { Select, type SelectOption } from "~/components/ui/Select";
import { DatePicker } from "~/components/ui/DatePicker";
import { MultiSelect, toStringArray } from "~/components/ui/MultiSelect";
import {
  type SimpleFilter,
  type FilterOperator,
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
/*  Field-type groupings                                                */
/* ------------------------------------------------------------------ */

const NUMERIC_TYPES = new Set([
  "number",
  "currency",
  "percent",
  "int",
  "integer",
  "float",
  "decimal",
  "double",
  "autonumber",
]);

const CHOICE_TYPES = new Set([
  "select",
  "picklist",
  "status",
  "multiselect",
  "checkboxes",
  "tags",
  "radio",
]);

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

  /* ---- Dropdown options ---- */
  const fieldOptions: SelectOption[] = useMemo(
    () => fields.map((f) => ({ label: f.label ?? f.name, value: f.name })),
    [fields],
  );

  const operatorOptions: SelectOption[] = useMemo(
    () =>
      availableOperators.map((op) => ({
        label: OPERATOR_META[op]?.label ?? op,
        value: op,
      })),
    [availableOperators],
  );

  const choiceOptions: SelectOption[] = useMemo(() => {
    if (fieldType === "boolean") {
      return [
        { label: "True", value: "true" },
        { label: "False", value: "false" },
      ];
    }
    return (selectedFieldDef?.options ?? []).map((o) => ({
      label: o.label,
      value: String(o.value),
    }));
  }, [fieldType, selectedFieldDef]);

  /* ---- When the field changes, reset the operator to one that's valid for
   * the new field type and clear stale values, so we never serialise an
   * operator the field doesn't support (e.g. "contains" on a number). ---- */
  const handleFieldChange = (name: string) => {
    const nextDef = fields.find((f) => f.name === name);
    const nextOps = operatorsForFieldType(nextDef?.type ?? "text");
    const keepOp = nextOps.includes(filter.operator)
      ? filter.operator
      : nextOps[0];
    onUpdate({ field: name, operator: keepOp, value: "", value2: undefined });
  };

  /* ---- A type-aware value control (used for both value & value2) ---- */
  const renderValueControl = (key: "value" | "value2") => {
    const current = filter[key];
    const setVal = (v: unknown) => onUpdate({ [key]: v } as Partial<SimpleFilter>);

    // Date / time → calendar picker, so the user never types epoch millis.
    if (fieldType === "date" || fieldType === "datetime" || fieldType === "time") {
      return (
        <DatePicker
          className="flex-1"
          mode={fieldType}
          value={(current as number | string | null) ?? null}
          onChange={(v) => setVal(v ?? "")}
        />
      );
    }

    // Choice / boolean → pick from the field's real options.
    if (CHOICE_TYPES.has(fieldType) || fieldType === "boolean") {
      // Multi-value operators take a set of choices.
      if (filter.operator === "in" || filter.operator === "not_in") {
        return (
          <MultiSelect
            className="flex-1"
            options={choiceOptions}
            value={toStringArray(current)}
            onValueChange={(vals) => setVal(vals)}
            placeholder="选择值"
          />
        );
      }
      return (
        <Select
          className="h-11 flex-1"
          options={choiceOptions}
          value={current != null ? String(current) : ""}
          onValueChange={(val) => setVal(val)}
          placeholder="选择值"
        />
      );
    }

    // Numeric / text → plain input with the right keyboard.
    const numeric = NUMERIC_TYPES.has(fieldType);
    return (
      <TextInput
        className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
        value={current != null ? String(current) : ""}
        onChangeText={(text) => setVal(text)}
        placeholder={key === "value2" ? "至" : "值"}
        placeholderTextColor="#94a3b8"
        keyboardType={numeric ? "numeric" : "default"}
      />
    );
  };

  return (
    <View className="mb-2 rounded-xl border border-border bg-card p-2.5">
      {/* Field selector (full width) */}
      <Select
        className="h-11"
        options={fieldOptions}
        value={filter.field}
        onValueChange={handleFieldChange}
        placeholder="选择字段"
      />

      {/* Operator + value(s) + remove */}
      <View className="mt-2 flex-row items-center gap-2">
        <Select
          className="h-11 w-28"
          options={operatorOptions}
          value={filter.operator}
          onValueChange={(op) => onUpdate({ operator: op as FilterOperator })}
          placeholder="条件"
        />

        {needsValue && renderValueControl("value")}
        {needsSecondValue && renderValueControl("value2")}

        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="移除筛选条件"
          className="p-1"
        >
          <X size={16} color="#ef4444" />
        </Pressable>
      </View>

      {!needsValue && (
        <Text className="mt-1 px-1 text-xs text-muted-foreground">
          {operatorMeta?.label ?? filter.operator}
        </Text>
      )}
    </View>
  );
}
