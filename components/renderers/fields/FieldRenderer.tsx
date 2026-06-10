import React from "react";
import { View, Text, TextInput, Pressable, Linking } from "react-native";
import { Switch } from "~/components/ui/Switch";
import { Select } from "~/components/ui/Select";
import { DatePicker } from "~/components/ui/DatePicker";
import { MultiSelect, toStringArray } from "~/components/ui/MultiSelect";
import { cn } from "~/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "~/lib/formatting";
import type { FieldDefinition, FieldType, SelectOption } from "../types";

/* ------------------------------------------------------------------ */
/*  Option helpers (select / radio / multiselect)                      */
/* ------------------------------------------------------------------ */

const SELECT_TYPES = new Set(["select", "radio", "picklist", "status"]);
const MULTI_TYPES = new Set(["multiselect", "checkboxes", "tags"]);

/** Whether a field type renders as a single coloured option badge. */
export function isSelectType(type: string | undefined): boolean {
  return SELECT_TYPES.has(type ?? "");
}

/** Find the option matching `value` in a field's option list. */
function findOption(
  field: FieldDefinition | undefined,
  value: unknown,
): SelectOption | undefined {
  return field?.options?.find((o) => String(o.value) === String(value));
}

/** Tailwind classes for a status badge, derived from an option colour name. */
function badgeClasses(color: string | undefined): string {
  switch ((color ?? "").toLowerCase()) {
    case "green":
    case "emerald":
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "red":
    case "rose":
    case "danger":
    case "error":
      return "bg-red-50 text-red-700";
    case "amber":
    case "yellow":
    case "orange":
    case "warning":
      return "bg-amber-50 text-amber-700";
    case "blue":
    case "indigo":
    case "primary":
      return "bg-blue-50 text-blue-700";
    case "purple":
    case "violet":
      return "bg-violet-50 text-violet-700";
    case "gray":
    case "grey":
    case "slate":
    case "neutral":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
}

/** Expand a `#rgb`/`#rrggbb` colour to a 6-digit hex, or null if not hex. */
function normalizeHex(color: string | undefined): string | null {
  const c = (color ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  }
  return null;
}

/**
 * Inline badge style for a hex option colour — a light tint background with the
 * colour itself as the text. Metadata authors often specify hex (`#10B981`)
 * rather than a named colour, which `badgeClasses` can't map; without this they
 * all fall back to a flat grey pill.
 */
function hexBadgeStyle(hex: string): { bg: { backgroundColor: string }; fg: { color: string } } {
  // 8-digit hex appends an alpha byte; `1F` ≈ 12% opacity for the tint.
  return { bg: { backgroundColor: `${hex}1F` }, fg: { color: hex } };
}

/**
 * A coloured option badge for a select/status field value — the same pill the
 * detail/form renderers use, exported so compact surfaces (list rows, related
 * lists) render the option's colour instead of flat text. Returns null for a
 * non-select field or an empty value.
 */
export function OptionBadge({
  field,
  value,
}: {
  field: FieldDefinition | undefined;
  value: unknown;
}) {
  if (!field || !isSelectType(field.type) || value == null || value === "") return null;
  const opt = findOption(field, value);
  return <StatusBadge label={opt?.label ?? String(value)} color={opt?.color} />;
}

/** A coloured pill for a select/status value. */
function StatusBadge({ label, color }: { label: string; color?: string }) {
  const hex = normalizeHex(color);
  if (hex) {
    const { bg, fg } = hexBadgeStyle(hex);
    return (
      <View className="self-start rounded-full px-2.5 py-1" style={bg}>
        <Text className="text-xs font-semibold" style={fg}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View className={cn("self-start rounded-full px-2.5 py-1", badgeClasses(color))}>
      <Text className={cn("text-xs font-semibold", badgeClasses(color))}>{label}</Text>
    </View>
  );
}

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

function ReadOnlyValue({ field, value }: { field: FieldDefinition; value: unknown }) {
  const type = field.type;
  const display = formatDisplayValue(value, type, field);

  // Single-select / status → coloured badge using the option's label + colour.
  if (SELECT_TYPES.has(type) && value != null && value !== "") {
    const opt = findOption(field, value);
    return <StatusBadge label={opt?.label ?? String(value)} color={opt?.color} />;
  }

  // Multi-select / tags → a row of pills.
  if (MULTI_TYPES.has(type) && Array.isArray(value) && value.length > 0) {
    return (
      <View className="flex-row flex-wrap gap-1.5">
        {value.map((v, i) => {
          const opt = findOption(field, v);
          return <StatusBadge key={i} label={opt?.label ?? String(v)} color={opt?.color} />;
        })}
      </View>
    );
  }

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

function SelectFieldInput({ field, value, onChange, error }: FieldRendererProps) {
  const options = (field.options ?? []).map((o) => ({
    label: o.label,
    value: String(o.value),
  }));

  return (
    <Select
      options={options}
      value={value != null ? String(value) : ""}
      onValueChange={(val) => onChange?.(val)}
      placeholder={`Select ${field.label ?? field.name}`}
      className={error ? "border-destructive" : undefined}
    />
  );
}

function MultiSelectFieldInput({ field, value, onChange, error }: FieldRendererProps) {
  return (
    <MultiSelect
      options={field.options ?? []}
      value={toStringArray(value)}
      onValueChange={(vals) => onChange?.(vals)}
      placeholder={`Select ${field.label ?? field.name}`}
      error={!!error}
    />
  );
}

function DateFieldInput({
  field,
  value,
  onChange,
  error,
  mode,
}: FieldRendererProps & { mode: "date" | "datetime" | "time" }) {
  return (
    <DatePicker
      mode={mode}
      value={value}
      onChange={(v) => onChange?.(v)}
      placeholder={`Select ${field.label ?? field.name}`}
      error={!!error}
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
        <ReadOnlyValue field={field} value={value} />
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
      return <MultiSelectFieldInput {...props} />;

    case "date":
      return <DateFieldInput {...props} mode="date" />;

    case "datetime":
      return <DateFieldInput {...props} mode="datetime" />;

    case "time":
      return <DateFieldInput {...props} mode="time" />;

    case "lookup":
    case "master_detail":
    case "tree":
      return <TextFieldInput {...props} />;

    default:
      return <TextFieldInput {...props} />;
  }
}

/**
 * Format a field value for read-only display. Locale-aware (via `lib/formatting`)
 * for numbers, currency, percent and dates; resolves select/multiselect values
 * to their option labels when the field definition is supplied.
 */
export function formatDisplayValue(
  value: unknown,
  type: FieldType,
  field?: FieldDefinition,
): string {
  if (value == null || value === "") return "—";

  switch (type) {
    case "boolean":
    case "toggle":
      return value ? "Yes" : "No";

    case "number":
    case "rating":
    case "slider":
    case "progress":
    case "autonumber": {
      const n = Number(value);
      return isNaN(n) ? String(value) : formatNumber(n);
    }

    case "currency": {
      const n = Number(value);
      return isNaN(n) ? String(value) : formatCurrency(n, { maximumFractionDigits: 2 });
    }

    case "percent": {
      const n = Number(value);
      return isNaN(n) ? String(value) : formatPercent(n);
    }

    case "date":
      return formatDate(value as string | number | Date, { style: "medium" });

    case "datetime":
      return formatDateTime(value as string | number | Date, { style: "medium" });

    case "select":
    case "radio": {
      const opt = findOption(field, value);
      return opt?.label ?? String(value);
    }

    case "tags":
    case "multiselect":
    case "checkboxes":
      if (Array.isArray(value)) {
        return value
          .map((v) => findOption(field, v)?.label ?? String(v))
          .join(", ");
      }
      return String(value);

    default:
      return String(value);
  }
}
