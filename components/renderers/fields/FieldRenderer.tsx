import React from "react";
import { View, Text, TextInput, Pressable, Linking } from "react-native";
import { Switch } from "~/components/ui/Switch";
import { Select } from "~/components/ui/Select";
import { cn } from "~/lib/utils";
import type { FieldDefinition, FieldType } from "../types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FieldRendererProps {
  /** ObjectQL field definition */
  field: FieldDefinition;
  /** Current value */
  value: unknown;
  /** Change handler (omit for read-only rendering) */
  onChange?: (value: unknown) => void;
  /** Force read-only mode */
  readonly?: boolean;
  /** Validation error message */
  error?: string;
  /** Additional className for wrapper */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Read-only value display                                            */
/* ------------------------------------------------------------------ */

function ReadOnlyValue({ value, type }: { value: unknown; type: FieldType }) {
  const display = formatDisplayValue(value, type);

  if ((type === "url" || type === "email") && typeof value === "string" && value) {
    const href = type === "email" ? `mailto:${value}` : value;
    return (
      <Pressable onPress={() => Linking.openURL(href)}>
        <Text className="text-base text-primary underline">{display}</Text>
      </Pressable>
    );
  }

  if (type === "boolean" || type === "toggle") {
    return (
      <View className="flex-row items-center">
        <View
          className={cn(
            "h-5 w-5 rounded-full",
            value ? "bg-emerald-500" : "bg-muted",
          )}
        />
        <Text className="ml-2 text-base text-foreground">
          {value ? "Yes" : "No"}
        </Text>
      </View>
    );
  }

  if (type === "color" && typeof value === "string") {
    return (
      <View className="flex-row items-center gap-2">
        <View
          className="h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: value }}
        />
        <Text className="text-base text-foreground">{value}</Text>
      </View>
    );
  }

  return <Text className="text-base text-foreground">{display}</Text>;
}

/* ------------------------------------------------------------------ */
/*  Editable field inputs                                              */
/* ------------------------------------------------------------------ */

function TextFieldInput({
  field,
  value,
  onChange,
  error,
  keyboardType,
  multiline,
}: FieldRendererProps & {
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
  multiline?: boolean;
}) {
  return (
    <TextInput
      className={cn(
        "rounded-lg border bg-background px-3 py-2.5 text-base text-foreground",
        error ? "border-destructive" : "border-input",
        multiline && "min-h-[100px]",
      )}
      value={value != null ? String(value) : ""}
      onChangeText={(text) => onChange?.(text)}
      placeholder={field.label ?? field.name}
      keyboardType={keyboardType}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      placeholderTextColor="#9ca3af"
      autoCapitalize={field.type === "email" ? "none" : "sentences"}
    />
  );
}

function NumberFieldInput({ field, value, onChange, error }: FieldRendererProps) {
  return (
    <TextInput
      className={cn(
        "rounded-lg border bg-background px-3 py-2.5 text-base text-foreground",
        error ? "border-destructive" : "border-input",
      )}
      value={value != null ? String(value) : ""}
      onChangeText={(text) => {
        const num = parseFloat(text);
        onChange?.(isNaN(num) ? text : num);
      }}
      placeholder={field.label ?? field.name}
      keyboardType="numeric"
      placeholderTextColor="#9ca3af"
    />
  );
}

function BooleanFieldInput({ value, onChange }: FieldRendererProps) {
  return (
    <Switch
      checked={Boolean(value)}
      onCheckedChange={(checked) => onChange?.(checked)}
    />
  );
}

function SelectFieldInput({ field, value, onChange }: FieldRendererProps) {
  const options = (field.options ?? []).map((o) => ({
    label: o.label,
    value: o.value,
  }));

  return (
    <Select
      options={options}
      value={value != null ? String(value) : ""}
      onValueChange={(val) => onChange?.(val)}
      placeholder={`Select ${field.label ?? field.name}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                         */
/* ------------------------------------------------------------------ */

export function FieldRenderer({
  field,
  value,
  onChange,
  readonly = false,
  error,
  className,
}: FieldRendererProps) {
  const isReadOnly = readonly || !onChange;

  return (
    <View className={cn("gap-1", className)}>
      {/* Label */}
      <Text className="text-sm font-medium text-muted-foreground">
        {field.label ?? field.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        {field.required && !isReadOnly ? (
          <Text className="text-destructive"> *</Text>
        ) : null}
      </Text>

      {/* Value / Input */}
      {isReadOnly ? (
        <ReadOnlyValue value={value} type={field.type} />
      ) : (
        renderEditableField(field, value, onChange!, error)
      )}

      {/* Help text */}
      {!isReadOnly && (field as Record<string, unknown>).helpText ? (
        <Text className="text-xs text-muted-foreground">{String((field as Record<string, unknown>).helpText)}</Text>
      ) : null}

      {/* Error */}
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderEditableField(
  field: FieldDefinition,
  value: unknown,
  onChange: (v: unknown) => void,
  error?: string,
) {
  const props: FieldRendererProps = { field, value, onChange, error };

  switch (field.type) {
    case "text":
    case "password":
    case "markdown":
    case "html":
    case "richtext":
    case "code":
    case "json":
      return <TextFieldInput {...props} />;

    case "textarea":
      return <TextFieldInput {...props} multiline />;

    case "email":
      return <TextFieldInput {...props} keyboardType="email-address" />;

    case "url":
      return <TextFieldInput {...props} keyboardType="url" />;

    case "phone":
      return <TextFieldInput {...props} keyboardType="phone-pad" />;

    case "number":
    case "currency":
    case "percent":
    case "rating":
    case "slider":
    case "progress":
      return <NumberFieldInput {...props} />;

    case "boolean":
    case "toggle":
      return <BooleanFieldInput {...props} />;

    case "select":
    case "radio":
      return <SelectFieldInput {...props} />;

    case "multiselect":
    case "checkboxes":
    case "tags":
      return <SelectFieldInput {...props} />;

    case "date":
    case "datetime":
    case "time":
      // Simplified: use text input with placeholder hint
      return (
        <TextFieldInput
          {...props}
          field={{ ...field, label: `${field.label ?? field.name} (${field.type})` }}
        />
      );

    case "lookup":
    case "master_detail":
    case "tree":
      return <TextFieldInput {...props} />;

    default:
      return <TextFieldInput {...props} />;
  }
}

export function formatDisplayValue(value: unknown, type: FieldType): string {
  if (value == null) return "—";

  switch (type) {
    case "boolean":
    case "toggle":
      return value ? "Yes" : "No";

    case "currency":
      return typeof value === "number"
        ? value.toLocaleString("en-US", { style: "currency", currency: "USD" })
        : String(value);

    case "percent":
      return typeof value === "number" ? `${value}%` : String(value);

    case "date":
      if (value instanceof Date) return value.toLocaleDateString();
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleDateString();
      }
      return String(value);

    case "datetime":
      if (value instanceof Date) return value.toLocaleString();
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleString();
      }
      return String(value);

    case "tags":
    case "multiselect":
    case "checkboxes":
      return Array.isArray(value) ? value.join(", ") : String(value);

    default:
      return String(value);
  }
}
