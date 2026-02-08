import React from "react";
import { Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { cn } from "~/lib/utils";

type ToastVariant = "default" | "error" | "success";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string) => void;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 0;

const variantStyles: Record<ToastVariant, string> = {
  default: "bg-foreground",
  error: "bg-destructive",
  success: "bg-primary",
};

const variantTextStyles: Record<ToastVariant, string> = {
  default: "text-background",
  error: "text-destructive-foreground",
  success: "text-primary-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, variant: ToastVariant) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: (msg) => addToast(msg, "default"),
      toastError: (msg) => addToast(msg, "error"),
      toastSuccess: (msg) => addToast(msg, "success"),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View className="absolute bottom-12 left-4 right-4 gap-2" pointerEvents="box-none">
        {toasts.map((t) => (
          <View
            key={t.id}
            className={cn(
              "flex-row items-center justify-between rounded-xl px-4 py-3 shadow-lg",
              variantStyles[t.variant]
            )}
          >
            <Text
              className={cn(
                "flex-1 text-sm font-medium",
                variantTextStyles[t.variant]
              )}
            >
              {t.message}
            </Text>
            <Pressable onPress={() => dismiss(t.id)} hitSlop={8}>
              <X size={16} className={variantTextStyles[t.variant]} />
            </Pressable>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
