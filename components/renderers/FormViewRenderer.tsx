import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Button } from "~/components/ui/Button";
import { webContentMaxWidth } from "~/lib/responsive";
import {
  isFieldVisible,
  isFieldReadonlyByCondition,
  isFieldRequiredByCondition,
  isSectionVisible,
  type ConditionHolder,
} from "~/lib/conditional-fields";
import { FieldRenderer } from "./fields/FieldRenderer";
import type { FieldDefinition, FormViewMeta, FormSection, FormFieldMeta } from "./types";

/**
 * Merge a field's conditional-field expressions (ObjectStack 8.0). A per-form
 * `FormFieldMeta` override wins over the field definition's own expression.
 */
function fieldConditions(meta: FormFieldMeta, fieldDef?: FieldDefinition): ConditionHolder {
  return {
    visibleWhen: meta.visibleWhen ?? fieldDef?.visibleWhen,
    readonlyWhen: meta.readonlyWhen ?? fieldDef?.readonlyWhen,
    requiredWhen: meta.requiredWhen ?? fieldDef?.requiredWhen,
  };
}

/* ------------------------------------------------------------------ */
/*  Entry-field filter                                                 */
/* ------------------------------------------------------------------ */

/**
 * Whether a field belongs on an auto-generated create/edit form. Excludes
 * internal keys, the id, system/audit fields, auto-numbers, hidden fields,
 * and server-computed read-only fields — none of which a user can set.
 */
function isEntryField(f: FieldDefinition): boolean {
  if (f.name.startsWith("_") || f.name === "id") return false;
  if (f.type === "autonumber" || f.type === "summary" || f.type === "formula") return false;
  const flag = (k: string) => (f as Record<string, unknown>)[k] === true;
  if (flag("system") || flag("hidden") || flag("readonly") || flag("disabled")) return false;
  return true;
}

/**
 * Coerce form values into the wire format the data API expects before submit.
 *
 * `date`/`datetime` fields flow through the form (and the DatePicker) as
 * epoch-ms numbers, but the ObjectStack data API requires ISO-8601 strings and
 * rejects raw epochs with a `invalid_date` validation error. Convert any
 * number / `Date` / numeric-string value on a date field to ISO-8601; leave
 * `time` ("HH:MM"), already-ISO strings, and empty values untouched.
 */
function normalizeForSubmit(
  values: Record<string, unknown>,
  fields: FieldDefinition[],
): Record<string, unknown> {
  const dateFields = new Set(
    fields.filter((f) => f.type === "date" || f.type === "datetime").map((f) => f.name),
  );
  if (dateFields.size === 0) return values;

  const out: Record<string, unknown> = { ...values };
  for (const name of dateFields) {
    const v = out[name];
    if (v == null || v === "") continue;
    let d: Date | null = null;
    if (v instanceof Date) d = v;
    else if (typeof v === "number") d = new Date(v);
    else if (typeof v === "string" && /^\d+$/.test(v.trim())) d = new Date(Number(v.trim()));
    if (d && !isNaN(d.getTime())) out[name] = d.toISOString();
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FormViewRendererProps {
  /** Form view metadata from the server */
  view?: FormViewMeta | null;
  /** Field definitions for the parent object */
  fields?: FieldDefinition[];
  /** Initial record data (for edit mode) */
  initialValues?: Record<string, unknown>;
  /** Submit handler */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
  /** Loading (submitting) */
  isSubmitting?: boolean;
  /** Read-only mode (detail display) */
  readonly?: boolean;
  /** Submit button label */
  submitLabel?: string;
  /** Per-field permissions: field name → { readable, editable } */
  fieldPermissions?: Record<string, { readable: boolean; editable: boolean }>;
}

/* ------------------------------------------------------------------ */
/*  Section component                                                  */
/* ------------------------------------------------------------------ */

function FormSectionView({
  section,
  fields,
  values,
  errors,
  onChange,
  readonly,
  fieldPermissions,
}: {
  section: FormSection;
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (field: string, value: unknown) => void;
  readonly: boolean;
  fieldPermissions?: Record<string, { readable: boolean; editable: boolean }>;
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false);

  const resolvedFields: { fieldDef: FieldDefinition; meta: FormFieldMeta }[] = useMemo(() => {
    return section.fields
      .map((f) => {
        const fieldName = typeof f === "string" ? f : f.field;
        const meta: FormFieldMeta = typeof f === "string" ? { field: f } : f;
        const fieldDef = fields.find((fd) => fd.name === fieldName);
        if (!fieldDef) return null;
        if (meta.hidden) return null;
        return { fieldDef, meta };
      })
      .filter(Boolean) as { fieldDef: FieldDefinition; meta: FormFieldMeta }[];
  }, [section.fields, fields]);

  return (
    <View className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
      {/* Section header */}
      {section.label && (
        <Pressable
          className="flex-row items-center justify-between border-b border-border px-4 py-3"
          onPress={section.collapsible ? () => setCollapsed(!collapsed) : undefined}
        >
          <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {section.label}
          </Text>
          {section.collapsible &&
            (collapsed ? (
              <ChevronDown size={16} color="#94a3b8" />
            ) : (
              <ChevronUp size={16} color="#94a3b8" />
            ))}
        </Pressable>
      )}

      {/* Fields */}
      {!collapsed && (
        <View className="gap-4 p-4">
          {resolvedFields.map(({ fieldDef, meta }) => {
            const conds = fieldConditions(meta, fieldDef);

            // Conditional visibility: legacy `visibleOn` (truthy dep) + 8.0
            // `visibleWhen` expression. Either hiding the field skips it.
            if (meta.visibleOn && !values[meta.visibleOn]) return null;
            if (!isFieldVisible(conds, values)) return null;

            const isFieldReadonly =
              readonly ||
              !!meta.readonly ||
              isFieldReadonlyByCondition(conds, values) ||
              (!!fieldPermissions?.[fieldDef.name] &&
                !fieldPermissions[fieldDef.name].editable);

            const isRequired =
              (meta.required ?? fieldDef.required ?? false) ||
              isFieldRequiredByCondition(conds, values);

            return (
              <FieldRenderer
                key={fieldDef.name}
                field={{
                  ...fieldDef,
                  label: meta.label ?? fieldDef.label,
                  required: isRequired,
                }}
                value={values[fieldDef.name]}
                onChange={
                  isFieldReadonly
                    ? undefined
                    : (val) => onChange(fieldDef.name, val)
                }
                readonly={isFieldReadonly}
                error={errors[fieldDef.name]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function FormViewRenderer({
  view,
  fields = [],
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  readonly = false,
  submitLabel = "Save",
  fieldPermissions,
}: FormViewRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Build sections ---- */
  const sections: FormSection[] = useMemo(() => {
    const viewSections = view?.sections ?? view?.groups;
    if (viewSections && viewSections.length > 0) {
      return viewSections;
    }

    // Fallback: one section with the user-editable fields. Skip fields a user
    // can't (or shouldn't) set on an entry form — system/audit fields
    // (created_at/created_by/…), auto-numbers, hidden fields, and
    // server-computed read-only fields (expected_revenue, days_in_stage, …).
    // Showing those as empty inputs is the classic "renders but unusable" trap.
    if (fields.length > 0) {
      return [
        {
          fields: fields.filter(isEntryField).map((f) => f.name),
        },
      ];
    }

    return [];
  }, [view, fields]);

  /* ---- Handlers ---- */
  const handleChange = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    // Basic validation
    const newErrors: Record<string, string> = {};
    for (const section of sections) {
      // A field inside a hidden section can't block the save.
      if (!isSectionVisible(section.visibleOn, values)) continue;
      for (const f of section.fields) {
        const fieldName = typeof f === "string" ? f : f.field;
        const meta: FormFieldMeta = typeof f === "string" ? { field: f } : f;
        const fieldDef = fields.find((fd) => fd.name === fieldName);
        const conds = fieldConditions(meta, fieldDef);

        // Don't validate a field the user can't see — a hidden (or
        // conditionally-hidden) required field must never block the save.
        if (meta.hidden) continue;
        if (meta.visibleOn && !values[meta.visibleOn]) continue;
        if (!isFieldVisible(conds, values)) continue;

        const isRequired =
          (meta.required ?? fieldDef?.required ?? false) ||
          isFieldRequiredByCondition(conds, values);
        if (isRequired) {
          const val = values[fieldName];
          if (val == null || val === "") {
            newErrors[fieldName] =
              `${fieldDef?.label ?? fieldName} is required`;
          }
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit?.(normalizeForSubmit(values, fields));
  }, [sections, fields, values, onSubmit]);

  /* ---- Render ---- */
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        contentContainerStyle={webContentMaxWidth}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section, idx) => {
          // Conditional section visibility (spec `FormSection.visibleOn`).
          if (!isSectionVisible(section.visibleOn, values)) return null;
          return (
            <FormSectionView
              key={section.label ?? `section-${idx}`}
              section={section}
              fields={fields}
              values={values}
              errors={errors}
              onChange={handleChange}
              readonly={readonly}
              fieldPermissions={fieldPermissions}
            />
          );
        })}

        {/* Action buttons */}
        {!readonly && onSubmit && (
          <View className="flex-row gap-3 pt-2">
            {onCancel && (
              <Button
                variant="outline"
                onPress={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              onPress={handleSubmit}
              loading={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
