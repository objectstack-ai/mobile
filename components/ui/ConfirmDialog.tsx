import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string;
  /** Body text below the title. */
  message?: string;
  /** Confirm button label. Defaults to `common.confirm`. */
  confirmLabel?: string;
  /** Cancel button label. Defaults to `common.cancel`. */
  cancelLabel?: string;
  /** Style the confirm button as destructive (e.g. delete). */
  destructive?: boolean;
}

interface ConfirmContextValue {
  /** Open a confirm dialog; resolves `true` if confirmed, `false` otherwise. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Cross-platform confirm dialog. Unlike `Alert.alert` (which renders nothing on
 * React Native Web), this is backed by the `Dialog`/`Modal` primitives and
 * works identically on web and native. Expose via {@link useConfirm}.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = React.useCallback(
    (value: boolean) => {
      setPending((curr) => {
        curr?.resolve(value);
        return null;
      });
    },
    [],
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        title={pending?.title ?? ""}
        description={pending?.message}
      >
        <View className="flex-row justify-end gap-3 pt-1">
          <Button variant="outline" onPress={() => settle(false)} className="flex-1">
            {pending?.cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={pending?.destructive ? "destructive" : "default"}
            onPress={() => settle(true)}
            className="flex-1"
          >
            {pending?.confirmLabel ?? t("common.confirm")}
          </Button>
        </View>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx.confirm;
}
