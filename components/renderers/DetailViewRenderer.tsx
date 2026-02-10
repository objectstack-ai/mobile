import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { FieldRenderer } from "./fields/FieldRenderer";
import type { FieldDefinition, FormViewMeta, FormSection, ActionMeta } from "./types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface DetailViewRendererProps {
  /** Form/detail view metadata (reuses FormViewMeta for section layout) */
  view?: FormViewMeta | null;
  /** Field definitions for the parent object */
  fields?: FieldDefinition[];
  /** Record data to display */
  record: Record<string, unknown> | null;
  /** Loading */
  isLoading?: boolean;
  /** Error */
  error?: Error | null;
  /** Retry handler */
  onRetry?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Custom action handler */
  onAction?: (action: ActionMeta) => void;
  /** Available actions */
  actions?: ActionMeta[];
  /** Related records by relationship name */
  relatedLists?: RelatedListConfig[];
  /** Handler when a related record is pressed */
  onRelatedRecordPress?: (objectName: string, record: Record<string, unknown>) => void;
  /** Navigate to the previous record */
  onPrevious?: () => void;
  /** Navigate to the next record */
  onNext?: () => void;
  /** Whether there is a previous record available */
  hasPrevious?: boolean;
  /** Whether there is a next record available */
  hasNext?: boolean;
  /** Label indicating position, e.g. "3 of 50" */
  positionLabel?: string;
  /** Permission: hide edit button when false */
  allowEdit?: boolean;
  /** Permission: hide delete button when false */
  allowDelete?: boolean;
}

export interface RelatedListConfig {
  label: string;
  objectName: string;
  records: Record<string, unknown>[];
  fields?: FieldDefinition[];
}

/* ------------------------------------------------------------------ */
/*  Action Bar                                                         */
/* ------------------------------------------------------------------ */

function DetailActionBar({
  onEdit,
  onDelete,
  actions,
  onAction,
}: Pick<DetailViewRendererProps, "onEdit" | "onDelete" | "actions" | "onAction">) {
  const hasActions = onEdit || onDelete || (actions && actions.length > 0);
  if (!hasActions) return null;

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-card px-4 py-3">
      {onEdit && (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-primary px-4 py-2"
          onPress={onEdit}
        >
          <Edit size={16} color="#fff" />
          <Text className="text-sm font-semibold text-primary-foreground">Edit</Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-destructive px-4 py-2"
          onPress={onDelete}
        >
          <Trash2 size={16} color="#fff" />
          <Text className="text-sm font-semibold text-destructive-foreground">Delete</Text>
        </Pressable>
      )}
      {actions?.map((action) => (
        <Pressable
          key={action.name}
          className="flex-row items-center gap-1.5 rounded-lg border border-border px-4 py-2"
          onPress={() => onAction?.(action)}
        >
          <Text className="text-sm font-medium text-foreground">{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Related List                                                       */
/* ------------------------------------------------------------------ */

function RelatedListSection({
  config,
  onRecordPress,
}: {
  config: RelatedListConfig;
  onRecordPress?: (objectName: string, record: Record<string, unknown>) => void;
}) {
  return (
    <View className="mb-4 rounded-xl border border-border bg-card overflow-hidden">
      <View className="border-b border-border px-4 py-3">
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {config.label} ({config.records.length})
        </Text>
      </View>
      <View className="p-2">
        {config.records.length === 0 ? (
          <Text className="px-2 py-4 text-center text-sm text-muted-foreground">
            No related records
          </Text>
        ) : (
          config.records.map((rec, idx) => {
            const displayName =
              (rec.name as string) ??
              (rec.label as string) ??
              (rec.title as string) ??
              (rec.subject as string) ??
              `Record ${idx + 1}`;
            return (
              <Pressable
                key={(rec.id as string) ?? idx}
                className="rounded-lg px-3 py-3 active:bg-muted/50"
                onPress={() => onRecordPress?.(config.objectName, rec)}
              >
                <Text className="text-base text-card-foreground">{String(displayName)}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Record Navigator                                                   */
/* ------------------------------------------------------------------ */

function RecordNavigator({
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  positionLabel,
}: Pick<
  DetailViewRendererProps,
  "onPrevious" | "onNext" | "hasPrevious" | "hasNext" | "positionLabel"
>) {
  if (!onPrevious && !onNext) return null;

  return (
    <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-2">
      <Pressable
        className={cn(
          "flex-row items-center rounded-lg px-3 py-2",
          hasPrevious ? "active:bg-muted" : "opacity-40",
        )}
        onPress={hasPrevious ? onPrevious : undefined}
        disabled={!hasPrevious}
      >
        <ChevronLeft size={16} color={hasPrevious ? "#1e40af" : "#94a3b8"} />
        <Text
          className={cn(
            "ml-1 text-sm font-medium",
            hasPrevious ? "text-primary" : "text-muted-foreground",
          )}
        >
          Previous
        </Text>
      </Pressable>

      {positionLabel && (
        <Text className="text-xs text-muted-foreground">{positionLabel}</Text>
      )}

      <Pressable
        className={cn(
          "flex-row items-center rounded-lg px-3 py-2",
          hasNext ? "active:bg-muted" : "opacity-40",
        )}
        onPress={hasNext ? onNext : undefined}
        disabled={!hasNext}
      >
        <Text
          className={cn(
            "mr-1 text-sm font-medium",
            hasNext ? "text-primary" : "text-muted-foreground",
          )}
        >
          Next
        </Text>
        <ChevronRight size={16} color={hasNext ? "#1e40af" : "#94a3b8"} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DetailViewRenderer({
  view,
  fields = [],
  record,
  isLoading = false,
  error,
  onRetry,
  onEdit,
  onDelete,
  onAction,
  actions,
  relatedLists,
  onRelatedRecordPress,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  positionLabel,
  allowEdit = true,
  allowDelete = true,
}: DetailViewRendererProps) {
  /* ---- Build sections ---- */
  const sections: FormSection[] = useMemo(() => {
    const viewSections = view?.sections ?? view?.groups;
    if (viewSections && viewSections.length > 0) {
      return viewSections;
    }

    // Fallback: single section with all record fields
    if (record) {
      return [
        {
          fields: Object.keys(record)
            .filter((k) => !k.startsWith("_") && k !== "id")
            .map((k) => k),
        },
      ];
    }

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
  }, [view, fields, record]);

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-destructive">{error.message}</Text>
        {onRetry && (
          <Pressable
            className="mt-4 rounded-xl bg-primary px-5 py-3"
            onPress={onRetry}
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!record) return null;

  /* ---- Render ---- */
  return (
    <View className="flex-1">
      {/* Action bar */}
      <DetailActionBar
        onEdit={allowEdit ? onEdit : undefined}
        onDelete={allowDelete ? onDelete : undefined}
        actions={actions}
        onAction={onAction}
      />

      {/* Record navigation (previous / next) */}
      <RecordNavigator
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        positionLabel={positionLabel}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
      >
        {/* Field sections */}
        {sections.map((section, idx) => (
          <View
            key={section.label ?? `section-${idx}`}
            className="mb-4 rounded-xl border border-border bg-card overflow-hidden"
          >
            {section.label && (
              <View className="border-b border-border px-4 py-3">
                <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </Text>
              </View>
            )}
            <View className="gap-4 p-4">
              {section.fields.map((f) => {
                const fieldName = typeof f === "string" ? f : f.field;
                const meta = typeof f === "string" ? null : f;
                if (meta?.hidden) return null;

                const fieldDef = fields.find((fd) => fd.name === fieldName);
                const label =
                  meta?.label ??
                  fieldDef?.label ??
                  fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                return (
                  <FieldRenderer
                    key={fieldName}
                    field={{
                      name: fieldName,
                      label,
                      type: fieldDef?.type ?? "text",
                      options: fieldDef?.options,
                    }}
                    value={record[fieldName]}
                    readonly
                  />
                );
              })}
            </View>
          </View>
        ))}

        {/* Related lists */}
        {relatedLists?.map((rl) => (
          <RelatedListSection
            key={rl.objectName}
            config={rl}
            onRecordPress={onRelatedRecordPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
