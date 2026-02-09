import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/Button";
import { FieldRenderer } from "./fields/FieldRenderer";
import type { FieldDefinition, FormViewMeta, FormSection, FormFieldMeta } from "./types";

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
            // Conditional visibility
            if (meta.visibleOn) {
              const depValue = values[meta.visibleOn];
              if (!depValue) return null;
            }

            const isFieldReadonly = readonly || meta.readonly ||
              (fieldPermissions?.[fieldDef.name] && !fieldPermissions[fieldDef.name].editable);

            return (
              <FieldRenderer
                key={fieldDef.name}
                field={{
                  ...fieldDef,
                  label: meta.label ?? fieldDef.label,
                  required: meta.required ?? fieldDef.required,
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

    // Fallback: create a single section with all fields
    if (fields.length > 0) {
      return [
        {
          fields: fields
            .filter((f) => !f.name.startsWith("_") && f.name !== "id")
            .map((f) => f.name),
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
      for (const f of section.fields) {
        const fieldName = typeof f === "string" ? f : f.field;
        const meta: FormFieldMeta = typeof f === "string" ? { field: f } : f;
        const fieldDef = fields.find((fd) => fd.name === fieldName);
        const isRequired = meta.required ?? fieldDef?.required;
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

    onSubmit?.(values);
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
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section, idx) => (
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
        ))}

        {/* Action buttons */}
        {!readonly && onSubmit && (
          <View className="flex-row gap-3 pt-2">
            {onCancel && (
              <Button
                variant="outline"
                onPress={onCancel}
                className="flex-1"
              >
                <Text className="text-base font-semibold text-foreground">Cancel</Text>
              </Button>
            )}
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-primary-foreground">
                  {submitLabel}
                </Text>
              )}
            </Button>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
