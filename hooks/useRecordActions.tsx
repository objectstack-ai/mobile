/**
 * Drives ObjectStack object actions on a record screen.
 *
 * Wires the framework-agnostic {@link runRecordAction} engine to on-device UI:
 * a native confirm (Alert), a parameter-collection BottomSheet, a result-reveal
 * dialog, and toasts. Returns `runAction` to invoke an action, a `busyName` for
 * per-button spinners, and `modals` JSX the screen must render once.
 */
import React from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ObjectStackClient } from "@objectstack/client";
import { BottomSheet } from "~/components/ui/BottomSheet";
import { Button } from "~/components/ui/Button";
import { Select } from "~/components/ui/Select";
import { Switch } from "~/components/ui/Switch";
import { DatePicker } from "~/components/ui/DatePicker";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import type { ActionMeta, ActionParamMeta } from "~/components/renderers/types";
import { runRecordAction, type ActionRunContext } from "~/lib/record-actions";

interface ParamState {
  action: ActionMeta;
  params: ActionParamMeta[];
  resolve: (values: Record<string, unknown> | null) => void;
}

interface ResultState {
  action: ActionMeta;
  data: unknown;
  resolve: () => void;
}

export interface UseRecordActionsArgs {
  client: ObjectStackClient;
  objectName: string;
  recordId: string;
  record: Record<string, unknown> | null;
  onRefresh: () => void;
}

export interface UseRecordActions {
  runAction: (action: ActionMeta) => void;
  busyName: string | null;
  modals: React.ReactNode;
}

/** Numeric-ish field types that should use a numeric keyboard. */
const NUMERIC_TYPES = new Set(["number", "currency", "percent", "rating", "slider"]);

/** Read a possibly-dotted path out of an arbitrary value. */
function valueAtPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, data);
}

function formatValue(value: unknown, format?: string): string {
  if (value == null) return "—";
  if (format === "json") return JSON.stringify(value, null, 2);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function useRecordActions({
  client,
  objectName,
  recordId,
  record,
  onRefresh,
}: UseRecordActionsArgs): UseRecordActions {
  const router = useRouter();
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();

  const [busyName, setBusyName] = React.useState<string | null>(null);
  const [paramState, setParamState] = React.useState<ParamState | null>(null);
  const [paramValues, setParamValues] = React.useState<Record<string, unknown>>({});
  const [resultState, setResultState] = React.useState<ResultState | null>(null);

  const showConfirm = useConfirm();
  const confirm = React.useCallback(
    (message: string) => showConfirm({ title: t("common.confirm"), message }),
    [showConfirm, t],
  );

  const collectParams = React.useCallback(
    (params: ActionParamMeta[], action: ActionMeta) =>
      new Promise<Record<string, unknown> | null>((resolve) => {
        // Seed defaults so untouched optional fields submit cleanly.
        const seed: Record<string, unknown> = {};
        for (const p of params) {
          if (p.type === "boolean" || p.type === "toggle") seed[p.name] = false;
        }
        setParamValues(seed);
        setParamState({ action, params, resolve });
      }),
    [],
  );

  const showResult = React.useCallback(
    (action: ActionMeta, data: unknown) =>
      new Promise<void>((resolve) => {
        setResultState({ action, data, resolve });
      }),
    [],
  );

  const ctx = React.useMemo<ActionRunContext>(
    () => ({
      client,
      objectName,
      recordId,
      record,
      confirm,
      collectParams,
      showResult,
      toast: (message, variant) =>
        variant === "error"
          ? toastError(message || t("actions.failed"))
          : toastSuccess(message || t("actions.completed")),
      navigate: (url) => router.push(url as never),
      onRefresh,
    }),
    [
      client,
      objectName,
      recordId,
      record,
      confirm,
      collectParams,
      showResult,
      toastError,
      toastSuccess,
      router,
      onRefresh,
      t,
    ],
  );

  const runAction = React.useCallback(
    (action: ActionMeta) => {
      setBusyName(action.name);
      void runRecordAction(action, ctx).finally(() => setBusyName(null));
    },
    [ctx],
  );

  /* ---- Param-collection submit/cancel ---- */
  const submitParams = React.useCallback(() => {
    const state = paramState;
    if (!state) return;
    // Enforce required fields.
    const missing = state.params.find(
      (p) => p.required && (paramValues[p.name] == null || paramValues[p.name] === ""),
    );
    if (missing) {
      toastError(t("actions.required", { field: missing.label }));
      return;
    }
    setParamState(null);
    state.resolve(paramValues);
  }, [paramState, paramValues, t, toastError]);

  const cancelParams = React.useCallback(() => {
    const state = paramState;
    setParamState(null);
    state?.resolve(null);
  }, [paramState]);

  const acknowledgeResult = React.useCallback(() => {
    const state = resultState;
    setResultState(null);
    state?.resolve();
  }, [resultState]);

  /* ---- Modals ---- */
  const modals = (
    <>
      <BottomSheet
        open={!!paramState}
        onOpenChange={(o) => {
          if (!o) cancelParams();
        }}
        title={paramState?.action.label}
      >
        <ScrollView className="max-h-96">
          {paramState?.params.map((param) => (
            <View key={param.name} className="mb-4">
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {param.label}
                {param.required ? <Text className="text-destructive"> *</Text> : null}
              </Text>
              {param.type === "boolean" || param.type === "toggle" ? (
                <Switch
                  checked={!!paramValues[param.name]}
                  onCheckedChange={(v) =>
                    setParamValues((prev) => ({ ...prev, [param.name]: v }))
                  }
                />
              ) : (param.type === "select" || param.type === "radio") && param.options ? (
                <Select
                  value={(paramValues[param.name] as string) ?? ""}
                  onValueChange={(v) =>
                    setParamValues((prev) => ({ ...prev, [param.name]: v }))
                  }
                  options={param.options}
                  placeholder={param.label}
                />
              ) : param.type === "date" || param.type === "datetime" || param.type === "time" ? (
                <DatePicker
                  value={paramValues[param.name]}
                  onChange={(v) =>
                    setParamValues((prev) => ({ ...prev, [param.name]: v }))
                  }
                  mode={param.type}
                  placeholder={param.label}
                />
              ) : (
                <TextInput
                  className="h-12 rounded-xl border border-input bg-background px-4 text-base text-foreground"
                  value={
                    paramValues[param.name] != null ? String(paramValues[param.name]) : ""
                  }
                  onChangeText={(text) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [param.name]: NUMERIC_TYPES.has(param.type)
                        ? text.replace(/[^0-9.-]/g, "")
                        : text,
                    }))
                  }
                  placeholder={param.label}
                  placeholderTextColor="#94a3b8"
                  keyboardType={NUMERIC_TYPES.has(param.type) ? "numeric" : "default"}
                  multiline={param.type === "textarea"}
                />
              )}
            </View>
          ))}
          <View className="mt-2 flex-row gap-3">
            <Button variant="outline" className="flex-1" onPress={cancelParams}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onPress={submitParams}>
              {paramState?.action.label ?? t("actions.submit")}
            </Button>
          </View>
        </ScrollView>
      </BottomSheet>

      <Modal
        visible={!!resultState}
        transparent
        animationType="fade"
        onRequestClose={acknowledgeResult}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl border border-border bg-background p-5">
            <Text className="mb-1 text-lg font-semibold text-foreground">
              {resultState?.action.resultDialog?.title ?? resultState?.action.label}
            </Text>
            {resultState?.action.resultDialog?.description ? (
              <Text className="mb-3 text-sm text-muted-foreground">
                {resultState.action.resultDialog.description}
              </Text>
            ) : null}
            <ScrollView className="max-h-80">
              {resultState?.action.resultDialog?.fields &&
              resultState.action.resultDialog.fields.length > 0 ? (
                resultState.action.resultDialog.fields.map((f) => (
                  <View key={f.path} className="mb-3">
                    <Text className="mb-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {f.label ?? f.path}
                    </Text>
                    <Text
                      className={
                        f.format === "secret" || f.format === "json"
                          ? "font-mono text-sm text-foreground"
                          : "text-base text-foreground"
                      }
                      selectable
                    >
                      {formatValue(valueAtPath(resultState.data, f.path), f.format)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="font-mono text-sm text-foreground" selectable>
                  {formatValue(resultState?.data, resultState?.action.resultDialog?.format)}
                </Text>
              )}
            </ScrollView>
            <Button className="mt-4" onPress={acknowledgeResult}>
              {resultState?.action.resultDialog?.acknowledge ?? t("common.done")}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );

  return { runAction, busyName, modals };
}
