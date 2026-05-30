import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { cn } from "~/lib/utils";
import type { ActionResult, ActionResultDialog } from "./ActionExecutor";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ResultDialogProps {
  /** The action result to display; renders only when it carries a `resultDialog`. */
  result: ActionResult | null;
  onDismiss: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Renders a spec v7 `Action.resultDialog` — surfaces an action's response after
 * it runs (TOTP URIs, OAuth secrets, backup codes, …). Secret-formatted values
 * are masked behind a Reveal toggle.
 */
export function ResultDialog({ result, onDismiss }: ResultDialogProps) {
  const dialog = result?.resultDialog;
  const visible = !!dialog;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md rounded-2xl bg-card p-5">
          {!!dialog?.title && (
            <Text className="text-lg font-semibold text-foreground">{dialog.title}</Text>
          )}
          {!!dialog?.description && (
            <Text className="mt-1 text-sm text-muted-foreground">{dialog.description}</Text>
          )}

          <ScrollView className="mt-4 max-h-80">
            {resolveFields(dialog, result?.data).map((f) => (
              <ResultField key={f.path} field={f} value={f.value} />
            ))}
          </ScrollView>

          <Pressable
            className="mt-5 rounded-lg bg-primary px-4 py-2.5"
            onPress={onDismiss}
            accessibilityRole="button"
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {dialog?.acknowledge ?? "Done"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Field rendering                                                    */
/* ------------------------------------------------------------------ */

type ResolvedField = {
  path: string;
  label?: string;
  format: NonNullable<ActionResultDialog["format"]>;
  value: unknown;
};

function ResultField({ field, value }: { field: ResolvedField; value: unknown }) {
  const [revealed, setRevealed] = useState(false);
  const isSecret = field.format === "secret";
  const display = formatValue(value, field.format, isSecret && !revealed);

  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-medium uppercase text-muted-foreground">
        {field.label ?? field.path}
      </Text>
      <View className="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2">
        <Text
          className={cn("flex-1 text-sm text-foreground", field.format === "json" && "font-mono")}
          selectable
        >
          {display}
        </Text>
        {isSecret && (
          <Pressable onPress={() => setRevealed((r) => !r)} accessibilityRole="button">
            <Text className="ml-3 text-xs font-semibold text-primary">
              {revealed ? "Hide" : "Reveal"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the list of fields to render. When `resultDialog.fields` is provided we
 * resolve each `path` against the action's response `data`; otherwise the whole
 * response is shown using the dialog-level format.
 */
function resolveFields(
  dialog: ActionResultDialog | undefined,
  data: unknown,
): ResolvedField[] {
  if (!dialog) return [];
  const defaultFormat = dialog.format ?? "text";
  if (dialog.fields && dialog.fields.length > 0) {
    return dialog.fields.map((f) => ({
      path: f.path,
      label: f.label,
      format: f.format ?? defaultFormat,
      value: getByPath(data, f.path),
    }));
  }
  return [{ path: "result", format: defaultFormat, value: data }];
}

/** Read a dot-delimited path (e.g. `account.totpUri`) from a value. */
export function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function formatValue(
  value: unknown,
  format: NonNullable<ActionResultDialog["format"]>,
  masked: boolean,
): string {
  if (value == null) return "—";
  if (masked) return "••••••••";
  switch (format) {
    case "json":
      return JSON.stringify(value, null, 2);
    case "code-list":
      return Array.isArray(value) ? value.map(String).join("\n") : String(value);
    case "qrcode":
    case "secret":
    case "text":
    default:
      return String(value);
  }
}
