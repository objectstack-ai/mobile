import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Sun, Moon, SmartphoneNfc } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useUIStore, type ThemeMode } from "~/stores/ui-store";
import { cn } from "~/lib/utils";

const OPTIONS: { mode: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
  { mode: "light", icon: Sun, labelKey: "appearance.light" },
  { mode: "dark", icon: Moon, labelKey: "appearance.dark" },
  { mode: "system", icon: SmartphoneNfc, labelKey: "appearance.system" },
];

/**
 * Theme/appearance selector — light / dark / system. Mirrors LanguageSelector;
 * writes through `useUIStore.setTheme`, which applies the NativeWind color
 * scheme live and persists the choice.
 */
export function ThemeSelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <View className={cn("gap-1", className)}>
      <Text className="mb-2 text-sm font-medium text-muted-foreground">
        {t("appearance.title")}
      </Text>
      {OPTIONS.map(({ mode, icon: Icon, labelKey }) => {
        const isActive = theme === mode;
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
                setTheme(mode);
              }
            }}
          >
            <View className="flex-row items-center gap-3">
              <Icon size={20} color={isActive ? "#1e40af" : "#64748b"} />
              <Text
                className={cn(
                  "text-base",
                  isActive ? "font-semibold text-primary" : "text-foreground",
                )}
              >
                {t(labelKey)}
              </Text>
            </View>
            {isActive && <Check size={18} color="#1e40af" />}
          </Pressable>
        );
      })}
    </View>
  );
}
