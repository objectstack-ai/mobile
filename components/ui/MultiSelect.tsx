import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronDown, Check, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import type { SelectOption } from "~/components/renderers/types";

export interface MultiSelectProps {
  /** Currently selected values. */
  value: string[];
  onValueChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  error?: boolean;
}

/** Coerce a stored multi-value (array, comma string, or scalar) to string[]. */
export function toStringArray(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter(Boolean);
  return [String(value)];
}

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  error,
}: MultiSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const selectedOptions = options.filter((o) => selectedSet.has(String(o.value)));

  const toggle = (val: string) => {
    void Haptics.selectionAsync();
    const next = new Set(selectedSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onValueChange(Array.from(next));
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selectedOptions.length ? selectedOptions.map((o) => o.label).join(", ") : placeholder}
        className={cn(
          "min-h-12 flex-row items-center justify-between rounded-xl border bg-background px-3 py-2 active:opacity-70",
          error ? "border-destructive" : "border-input",
          className,
        )}
      >
        {selectedOptions.length === 0 ? (
          <Text className="px-1 text-base text-muted-foreground">{placeholder}</Text>
        ) : (
          <View className="flex-1 flex-row flex-wrap gap-1.5">
            {selectedOptions.map((o) => (
              <View
                key={String(o.value)}
                className="flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1"
              >
                <Text className="text-xs font-medium text-foreground">{o.label}</Text>
                <Pressable hitSlop={6} onPress={() => toggle(String(o.value))}>
                  <X size={12} className="text-muted-foreground" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <ChevronDown size={16} className="ml-1 text-muted-foreground" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="max-h-96 w-full max-w-sm rounded-2xl border border-border bg-background p-2"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView>
              {options.map((option) => {
                const checked = selectedSet.has(String(option.value));
                return (
                  <Pressable
                    key={String(option.value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggle(String(option.value))}
                    className="flex-row items-center justify-between rounded-lg px-3 py-3 active:bg-accent"
                  >
                    <Text className="text-base text-foreground">{option.label}</Text>
                    <View
                      className={cn(
                        "h-5 w-5 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary" : "border-input bg-background",
                      )}
                    >
                      {checked && <Check size={14} color="#ffffff" />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} className="mt-1 items-center rounded-lg bg-primary py-2.5">
              <Text className="text-sm font-semibold text-primary-foreground">{t("common.done")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
