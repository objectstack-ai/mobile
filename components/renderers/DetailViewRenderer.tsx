import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";
import Animated, { FadeInDown } from "react-native-reanimated";
import { webContentMaxWidth } from "~/lib/responsive";
import {
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MoreHorizontal,
  Check,
  Pencil,
} from "lucide-react-native";
import { cn } from "~/lib/utils";
import { getIcon } from "~/lib/getIcon";
import { EmptyState } from "~/components/common/EmptyState";
import { Button } from "~/components/ui/Button";
import { BottomSheet } from "~/components/ui/BottomSheet";
import { Skeleton } from "~/components/ui/Skeleton";
import { isFieldVisible, isSectionVisible } from "~/lib/conditional-fields";
import { FieldRenderer, isSelectType, OptionBadge } from "./fields/FieldRenderer";
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
  /** Header (`record_header`) object actions, rendered as inline buttons. */
  actions?: ActionMeta[];
  /** Overflow (`record_more`) object actions, rendered in a "⋯" menu. */
  moreActions?: ActionMeta[];
  /** Name of the action currently executing (drives the per-button spinner). */
  busyActionName?: string | null;
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
  /** Extra content rendered at the end of the scroll body (e.g. lifecycle diagram). */
  footer?: React.ReactNode;
  /**
   * Inline-edit a select/status field straight from the detail. When provided,
   * those fields render a tappable badge that opens an option picker; the
   * handler persists the change. Omit to keep the detail strictly read-only.
   */
  onFieldEdit?: (field: string, value: unknown) => void | Promise<void>;
}

export interface RelatedListConfig {
  label: string;
  objectName: string;
  records: Record<string, unknown>[];
  fields?: FieldDefinition[];
  /** Columns to display per record (ObjectStack 8.0 `relatedListColumns`). */
  columns?: string[];
}

/** Humanize a field name for a column header: `due_date` → `Due Date`. */
function humanizeField(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best-effort display name when no columns are configured. */
function recordDisplayName(rec: Record<string, unknown>, index: number): string {
  return String(
    (rec.name as string) ??
      (rec.label as string) ??
      (rec.title as string) ??
      (rec.subject as string) ??
      `Record ${index + 1}`,
  );
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

/**
 * Internal plumbing fields the server injects onto every record (multi-tenancy
 * / sharding keys). They aren't part of the object's declared fields, carry no
 * business meaning, and must never surface in the auto-layout — unlike the
 * audit fields above, they don't even belong in "System Information".
 */
const INTERNAL_FIELDS = new Set(["organization_id", "tenant_id", "space_id"]);

/* ------------------------------------------------------------------ */
/*  Action Bar                                                         */
/* ------------------------------------------------------------------ */

/** Per-variant container + label classes for a header action button. */
const ACTION_VARIANT_BG: Record<string, string> = {
  primary: "bg-primary active:opacity-80",
  danger: "bg-destructive active:opacity-80",
  secondary: "border border-border active:bg-muted",
  ghost: "active:bg-muted",
  link: "active:opacity-60",
};
const ACTION_VARIANT_TEXT: Record<string, string> = {
  primary: "text-primary-foreground",
  danger: "text-destructive-foreground",
  secondary: "text-foreground",
  ghost: "text-foreground",
  link: "text-primary",
};
/**
 * Icon tint per variant (lucide needs an explicit color, not a class). The
 * neutral and link variants must follow the theme — a hardcoded near-black
 * (#0f172a) icon was invisible on a dark card once dark mode shipped.
 */
function actionIconColor(variant: string, isDark: boolean): string {
  switch (variant) {
    case "primary":
    case "danger":
      return "#ffffff";
    case "link":
      return isDark ? "#60a5fa" : "#1e40af";
    default:
      return isDark ? "#e2e8f0" : "#0f172a";
  }
}

function HeaderActionButton({
  action,
  onAction,
  busy,
}: {
  action: ActionMeta;
  onAction?: (action: ActionMeta) => void;
  busy: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const variant = action.variant ?? "secondary";
  const iconColor = actionIconColor(variant, isDark);
  const Icon = action.icon ? getIcon(action.icon) : null;
  return (
    <Pressable
      className={cn(
        "flex-row items-center gap-1.5 rounded-lg px-4 py-2",
        ACTION_VARIANT_BG[variant],
        busy && "opacity-60",
      )}
      onPress={() => !busy && onAction?.(action)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : Icon ? (
        <Icon size={16} color={iconColor} />
      ) : null}
      <Text className={cn("text-sm font-semibold", ACTION_VARIANT_TEXT[variant])}>
        {action.label}
      </Text>
    </Pressable>
  );
}

/** Header `actions` shown inline before the rest spill into the ⋯ menu. */
const MAX_INLINE_ACTIONS = 2;

function DetailActionBar({
  onEdit,
  onDelete,
  actions,
  moreActions,
  onAction,
  busyActionName,
}: Pick<
  DetailViewRendererProps,
  "onEdit" | "onDelete" | "actions" | "moreActions" | "onAction" | "busyActionName"
>) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [moreOpen, setMoreOpen] = useState(false);

  // Cap inline header actions so the bar can't overflow horizontally on a
  // phone — the surplus joins the `record_more` actions in the ⋯ menu.
  const inlineActions = (actions ?? []).slice(0, MAX_INLINE_ACTIONS);
  const overflowActions = [
    ...(actions ?? []).slice(MAX_INLINE_ACTIONS),
    ...(moreActions ?? []),
  ];
  const hasMore = overflowActions.length > 0;
  const hasActions =
    onEdit || onDelete || inlineActions.length > 0 || hasMore;
  if (!hasActions) return null;

  return (
    <View className="flex-row items-center gap-2 border-b border-border bg-card px-4 py-3">
      {onEdit && (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-primary px-4 py-2 active:opacity-80"
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t("common.edit")}
        >
          <Edit size={16} color="#fff" />
          <Text className="text-sm font-semibold text-primary-foreground">
            {t("common.edit")}
          </Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          className="flex-row items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 active:opacity-80"
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t("common.delete")}
        >
          <Trash2 size={16} color="#fff" />
          <Text className="text-sm font-semibold text-destructive-foreground">
            {t("common.delete")}
          </Text>
        </Pressable>
      )}
      {inlineActions.map((action) => (
        <HeaderActionButton
          key={action.name}
          action={action}
          onAction={onAction}
          busy={busyActionName === action.name}
        />
      ))}

      {hasMore && (
        <>
          <Pressable
            className="ms-auto h-9 w-9 items-center justify-center rounded-lg active:bg-muted"
            onPress={() => setMoreOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("records.moreActions")}
          >
            <MoreHorizontal size={20} color={isDark ? "#e2e8f0" : "#0f172a"} />
          </Pressable>

          <BottomSheet
            open={moreOpen}
            onOpenChange={setMoreOpen}
            title={t("records.actionsTitle")}
          >
            {overflowActions.map((action) => {
              const Icon = action.icon ? getIcon(action.icon) : null;
              const busy = busyActionName === action.name;
              const danger = action.variant === "danger";
              const neutralIcon = isDark ? "#e2e8f0" : "#0f172a";
              return (
                <Pressable
                  key={action.name}
                  className="flex-row items-center gap-3 rounded-lg px-2 py-3 active:bg-muted"
                  onPress={() => {
                    if (busy) return;
                    setMoreOpen(false);
                    onAction?.(action);
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={danger ? "#dc2626" : neutralIcon} />
                  ) : Icon ? (
                    <Icon size={18} color={danger ? "#dc2626" : neutralIcon} />
                  ) : (
                    <View className="w-[18px]" />
                  )}
                  <Text
                    className={cn(
                      "text-base",
                      danger ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </BottomSheet>
        </>
      )}
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
  const { t } = useTranslation();
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
            {t("records.noRelated")}
          </Text>
        ) : (
          config.records.map((rec, idx) => (
            <Pressable
              key={(rec.id as string) ?? idx}
              className="rounded-lg px-3 py-3 active:bg-muted/50"
              onPress={() => onRecordPress?.(config.objectName, rec)}
            >
              {config.columns && config.columns.length > 0 ? (
                // 8.0 `relatedListColumns`: a labelled value per configured column.
                <View className="gap-0.5">
                  {config.columns.map((col) => (
                    <View key={col} className="flex-row justify-between gap-3">
                      <Text className="text-xs text-muted-foreground">{humanizeField(col)}</Text>
                      <Text className="flex-1 text-end text-sm text-card-foreground" numberOfLines={1}>
                        {rec[col] == null ? "—" : String(rec[col])}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-base text-card-foreground">
                  {recordDisplayName(rec, idx)}
                </Text>
              )}
            </Pressable>
          ))
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
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
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
        <ChevronLeft size={16} color={hasPrevious ? accent : "#94a3b8"} />
        <Text
          className={cn(
            "ms-1 text-sm font-medium",
            hasPrevious ? "text-primary" : "text-muted-foreground",
          )}
        >
          {t("records.previous")}
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
            "me-1 text-sm font-medium",
            hasNext ? "text-primary" : "text-muted-foreground",
          )}
        >
          {t("records.next")}
        </Text>
        <ChevronRight size={16} color={hasNext ? accent : "#94a3b8"} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline select edit                                                 */
/* ------------------------------------------------------------------ */

/**
 * A select/status field shown as its coloured badge with a pencil affordance.
 * Tapping opens a picker; choosing a new option calls `onEdit` (which persists)
 * and reflects a saving spinner until it resolves.
 */
function EditableSelectField({
  label,
  field,
  value,
  onEdit,
}: {
  label: string;
  field: FieldDefinition;
  value: unknown;
  onEdit: (value: unknown) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const options = field.options ?? [];

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      <Pressable
        className="flex-row items-center gap-2 self-start active:opacity-70"
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("records.editField", { field: label })}
      >
        {value != null && value !== "" ? (
          <OptionBadge field={field} value={value} />
        ) : (
          <Text className="text-base text-muted-foreground">—</Text>
        )}
        {saving ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <Pencil size={13} color="#94a3b8" />
        )}
      </Pressable>

      <BottomSheet open={open} onOpenChange={setOpen} title={label}>
        {options.map((opt) => {
          const selected = String(opt.value) === String(value);
          return (
            <Pressable
              key={String(opt.value)}
              className="flex-row items-center justify-between rounded-lg px-2 py-3 active:bg-muted"
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label ?? String(opt.value)}
              onPress={async () => {
                if (selected) {
                  setOpen(false);
                  return;
                }
                setSaving(true);
                try {
                  await onEdit(opt.value);
                } finally {
                  setSaving(false);
                  setOpen(false);
                }
              }}
            >
              <OptionBadge field={field} value={opt.value} />
              {selected && <Check size={18} color={accent} />}
            </Pressable>
          );
        })}
      </BottomSheet>
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
  moreActions,
  busyActionName,
  relatedLists,
  onRelatedRecordPress,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  positionLabel,
  allowEdit = true,
  allowDelete = true,
  footer,
  onFieldEdit,
}: DetailViewRendererProps) {
  const { t } = useTranslation();

  /* ---- Build sections ---- */
  const sections: FormSection[] = useMemo(() => {
    const viewSections = view?.sections ?? view?.groups;
    if (viewSections && viewSections.length > 0) {
      return viewSections;
    }

    // Fallback: auto-layout, business fields first then a trailing "System
    // Information" section for audit fields.
    // Fields whose object metadata marks them hidden/system — the curated form
    // view filters these via `isEntryField`; the fallback must match so a
    // hidden field never leaks into the detail layout.
    const hiddenByMeta = new Set(
      fields
        .filter((f) => {
          const flag = (k: string) => (f as Record<string, unknown>)[k] === true;
          return flag("hidden") || flag("system");
        })
        .map((f) => f.name),
    );

    const isEmptyValue = (v: unknown) =>
      v == null || v === "" || (Array.isArray(v) && v.length === 0);

    const buildSections = (allKeys: string[]): FormSection[] => {
      const keys = allKeys.filter(
        (k) =>
          !k.startsWith("_") &&
          k !== "id" &&
          !INTERNAL_FIELDS.has(k) &&
          !hiddenByMeta.has(k) &&
          // In the auto-layout (no curated view) an empty field is just a "—"
          // taking up a line; collapse it. Curated views still show every
          // field the author chose, empty or not.
          !(record != null && isEmptyValue(record[k])),
      );
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
        title={t("records.loadOneError")}
        description={error.message}
        action={
          onRetry ? (
            <Button size="sm" onPress={onRetry}>
              {t("common.retry")}
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
        moreActions={moreActions}
        onAction={onAction}
        busyActionName={busyActionName}
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
        contentContainerStyle={webContentMaxWidth}
      >
        {/* Field sections */}
        {sections.map((section, idx) => {
          // Conditional section visibility (spec `FormSection.visibleOn`).
          if (!isSectionVisible(section.visibleOn, record)) return null;
          return (
          <Animated.View
            key={section.label ?? `section-${idx}`}
            entering={FadeInDown.delay(idx * 60).duration(360)}
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

                // Conditional visibility (ObjectStack 8.0 `visibleWhen`),
                // evaluated against the record. A `FormFieldMeta` override
                // wins over the field definition's own expression.
                const visibleWhen = meta?.visibleWhen ?? fieldDef?.visibleWhen;
                if (!isFieldVisible({ visibleWhen }, record)) return null;

                const label =
                  meta?.label ??
                  fieldDef?.label ??
                  fieldName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                const fieldShape = {
                  name: fieldName,
                  label,
                  type: fieldDef?.type ?? "text",
                  options: fieldDef?.options,
                };

                // Inline-editable select/status fields (when a handler is wired
                // and the field carries options) become a tappable badge.
                const editable =
                  !!onFieldEdit &&
                  isSelectType(fieldShape.type) &&
                  (fieldDef?.options?.length ?? 0) > 0 &&
                  !meta?.readonly;

                if (editable) {
                  return (
                    <EditableSelectField
                      key={fieldName}
                      label={label}
                      field={fieldShape}
                      value={record[fieldName]}
                      onEdit={(v) => onFieldEdit!(fieldName, v)}
                    />
                  );
                }

                return (
                  <FieldRenderer
                    key={fieldName}
                    field={fieldShape}
                    value={record[fieldName]}
                    readonly
                  />
                );
              })}
            </View>
          </Animated.View>
          );
        })}

        {/* Related lists */}
        {relatedLists?.map((rl) => (
          <RelatedListSection
            key={rl.objectName}
            config={rl}
            onRecordPress={onRelatedRecordPress}
          />
        ))}

        {/* Extra content (e.g. lifecycle / state machine diagram) */}
        {footer}
      </ScrollView>
    </View>
  );
}
