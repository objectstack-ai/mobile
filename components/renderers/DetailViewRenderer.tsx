import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react-native";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/common/EmptyState";
import { Button } from "~/components/ui/Button";
import { Skeleton } from "~/components/ui/Skeleton";
import { FieldRenderer } from "./fields/FieldRenderer";
import type { FieldDefinition, FormViewMeta, FormSection, ActionMeta } from "./types";

/** Skeleton placeholder that mirrors the detail's stacked section/field layout. */
function DetailSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {[0, 1].map((s) => (
        <View
          key={s}
          className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
        >
          <View className="gap-5 p-4">
            {[0, 1, 2].map((r) => (
              <View key={r} className="gap-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-5 w-2/3 rounded-md" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

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

/**
 * Audit/system fields the server attaches to every record. They carry no
 * business meaning at a glance, so when we fall back to auto-laying-out a
 * record (no curated form view) we push them into a trailing "System
 * Information" section instead of letting them lead — otherwise "Created At /
 * Last Modified By" bury the fields the user actually came to read.
 */
const SYSTEM_FIELDS = new Set([
  "created_at",
  "updated_at",
  "modified_at",
  "last_modified_at",
  "created_by",
  "updated_by",
  "modified_by",
  "last_modified_by",
]);

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
          className="flex-row items-center gap-1.5 rounded-lg bg-primary px-4 py-2 active:opacity-80"
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit record"
        >
          <Edit size={16} color="#fff" />
          <Text className="text-sm font-semibold text-primary-foreground">Edit</Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 active:opacity-80"
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete record"
        >
          <Trash2 size={16} color="#fff" />
          <Text className="text-sm font-semibold text-destructive-foreground">Delete</Text>
        </Pressable>
      )}
      {actions?.map((action) => (
        <Pressable
          key={action.name}
          className="flex-row items-center gap-1.5 rounded-lg border border-border px-4 py-2 active:bg-muted"
          onPress={() => onAction?.(action)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
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

    // Fallback: auto-layout, business fields first then a trailing "System
    // Information" section for audit fields.
    const buildSections = (allKeys: string[]): FormSection[] => {
      const keys = allKeys.filter((k) => !k.startsWith("_") && k !== "id");
      const business = keys.filter((k) => !SYSTEM_FIELDS.has(k));
      const system = keys.filter((k) => SYSTEM_FIELDS.has(k));
      const result: FormSection[] = [];
      if (business.length > 0) result.push({ fields: business });
      if (system.length > 0)
        result.push({ label: "System Information", fields: system });
      return result;
    };

    if (record) {
      return buildSections(Object.keys(record));
    }

    if (fields.length > 0) {
      return buildSections(fields.map((f) => f.name));
    }

    return [];
  }, [view, fields, record]);

  /* ---- Loading ---- */
  if (isLoading) {
    return <DetailSkeleton />;
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <EmptyState
        icon={
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle size={40} color="#dc2626" />
          </View>
        }
        title="Couldn't Load Record"
        description={error.message}
        action={
          onRetry ? (
            <Button size="sm" onPress={onRetry}>
              Retry
            </Button>
          ) : undefined
        }
      />
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
