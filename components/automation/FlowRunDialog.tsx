import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "~/components/ui/Dialog";
import { Button } from "~/components/ui/Button";
import { FieldRenderer } from "~/components/renderers/fields/FieldRenderer";
import type { FieldDefinition } from "~/components/renderers";
import type { FlowVariable } from "~/hooks/useFlows";

export interface FlowRunDialogProps {
  open: boolean;
  flowLabel: string;
  /** The flow's input variables to collect before running. */
  inputs: FlowVariable[];
  isRunning?: boolean;
  onCancel: () => void;
  /** Run with the collected `{ varName: value }` params. */
  onRun: (params: Record<string, unknown>) => void;
}

function humanize(token: string): string {
  // Flow variables are camelCase (e.g. `opportunityName`); split those too.
  return token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Coerce a date/datetime field value (epoch-ms or Date) to ISO-8601. */
function normalizeValue(type: string | undefined, value: unknown): unknown {
  if (value == null || value === "") return value;
  if (type === "date" || type === "datetime") {
    const d =
      value instanceof Date
        ? value
        : typeof value === "number" || /^\d+$/.test(String(value).trim())
          ? new Date(Number(value))
          : null;
    if (d && !isNaN(d.getTime())) return d.toISOString();
  }
  return value;
}

/**
 * Collects an input-driven flow's variables before triggering it. Rendered only
 * when the flow declares `isInput` variables; field-less flows run straight from
 * the simple confirm dialog instead.
 */
export function FlowRunDialog({
  open,
  flowLabel,
  inputs,
  isRunning = false,
  onCancel,
  onRun,
}: FlowRunDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = React.useState<Record<string, unknown>>({});

  // Reset collected values whenever the dialog (re)opens.
  React.useEffect(() => {
    if (open) setValues({});
  }, [open]);

  const handleRun = () => {
    const params: Record<string, unknown> = {};
    for (const v of inputs) {
      params[v.name] = normalizeValue(v.type, values[v.name]);
    }
    onRun(params);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)} title={t("workflow.runFlow")}>
      <Text className="mb-3 text-sm text-muted-foreground">{flowLabel}</Text>
      <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled">
        <View className="gap-4">
          {inputs.map((v) => {
            const field: FieldDefinition = {
              name: v.name,
              label: humanize(v.name),
              type: (v.type ?? "text") as FieldDefinition["type"],
            };
            return (
              <FieldRenderer
                key={v.name}
                field={field}
                value={values[v.name]}
                onChange={(val) => setValues((prev) => ({ ...prev, [v.name]: val }))}
              />
            );
          })}
        </View>
      </ScrollView>
      <View className="mt-4 flex-row justify-end gap-3">
        <Button variant="outline" onPress={onCancel} disabled={isRunning} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button onPress={handleRun} loading={isRunning} className="flex-1">
          {t("workflow.runLabel")}
        </Button>
      </View>
    </Dialog>
  );
}
