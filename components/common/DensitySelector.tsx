import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";
import { Check, Rows3, Rows4 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useUIStore, type Density } from "~/stores/ui-store";
import { cn } from "~/lib/utils";

const OPTIONS: { mode: Density; icon: typeof Rows3; labelKey: string }[] = [
  { mode: "comfortable", icon: Rows3, labelKey: "appearance.comfortable" },
  { mode: "compact", icon: Rows4, labelKey: "appearance.compact" },
];

/**
 * Default list density selector — comfortable / compact. Sets the fallback row
 * spacing used by list views that don't dictate their own `rowHeight`.
 */
export function DensitySelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);

  return (
    <View className={cn("gap-1", className)}>
      <Text className="mb-2 text-sm font-medium text-muted-foreground">
        {t("appearance.density")}
      </Text>
      {OPTIONS.map(({ mode, icon: Icon, labelKey }) => {
        const isActive = density === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t(labelKey)}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-4 py-3 active:opacity-70",
              isActive ? "bg-primary/10" : "bg-card",
            )}
            onPress={() => {
              if (!isActive) {
                void Haptics.selectionAsync();
                setDensity(mode);
              }
            }}
          >
            <View className="flex-row items-center gap-3">
              <Icon size={20} color={isActive ? accent : "#64748b"} />
              <Text
                className={cn(
                  "text-base",
                  isActive ? "font-semibold text-primary" : "text-foreground",
                )}
              >
                {t(labelKey)}
              </Text>
            </View>
            {isActive && <Check size={18} color={accent} />}
          </Pressable>
        );
      })}
    </View>
  );
}
