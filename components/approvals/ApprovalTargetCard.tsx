import React from "react";
import { View, Text } from "react-native";
import { FieldRenderer } from "~/components/renderers/fields/FieldRenderer";
import { renderRecordTitle } from "~/lib/record-title";
import type { FieldDefinition } from "~/components/renderers";
import type { ObjectMeta } from "~/hooks/useObjectMeta";

const SYSTEM_FIELDS = new Set([
  "created_at",
  "updated_at",
  "modified_at",
  "last_modified_at",
  "created_by",
  "updated_by",
  "modified_by",
  "last_modified_by",
  "organization_id",
]);

/** How many populated business fields to preview under the title. */
const MAX_FIELDS = 8;

export interface ApprovalTargetCardProps {
  objectLabel: string;
  meta: ObjectMeta | null;
  fields: FieldDefinition[];
  record: Record<string, unknown> | null;
}

/**
 * A read-only summary of the business record an approval is about: its title
 * plus the first few populated fields — so the approver can review before
 * deciding.
 */
export function ApprovalTargetCard({
  objectLabel,
  meta,
  fields,
  record,
}: ApprovalTargetCardProps) {
  const title = renderRecordTitle(meta, record, objectLabel);

  const previewFields = React.useMemo(() => {
    if (!record) return [];
    return fields
      .filter((f) => {
        if (f.name.startsWith("_") || f.name === "id") return false;
        if (SYSTEM_FIELDS.has(f.name)) return false;
        const v = record[f.name];
        return v != null && v !== "";
      })
      .slice(0, MAX_FIELDS);
  }, [fields, record]);

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <View className="border-b border-border px-4 py-3">
        <Text className="text-xs uppercase tracking-wide text-muted-foreground">{objectLabel}</Text>
        <Text className="mt-0.5 text-base font-semibold text-foreground">{title}</Text>
      </View>
      <View className="gap-4 p-4">
        {previewFields.length === 0 ? (
          <Text className="text-sm text-muted-foreground">—</Text>
        ) : (
          previewFields.map((f) => (
            <FieldRenderer
              key={f.name}
              field={{
                name: f.name,
                label: f.label ?? f.name,
                type: f.type ?? "text",
                options: f.options,
              }}
              value={record![f.name]}
              readonly
            />
          ))
        )}
      </View>
    </View>
  );
}
