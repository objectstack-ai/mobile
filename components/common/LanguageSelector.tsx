import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import { SUPPORTED_LANGUAGES } from "~/lib/i18n";
import { useUIStore } from "~/stores/ui-store";
import { cn } from "~/lib/utils";

/**
 * A simple language selector list.
 * Each row shows the language label and a checkmark for the active language.
 */
export function LanguageSelector({ className }: { className?: string }) {
  const { t } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  return (
    <View className={cn("gap-1", className)}>
      <Text className="mb-2 text-sm font-medium text-muted-foreground">
        {t("common.language")}
      </Text>
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = language === lang.code;
        return (
          <Pressable
            key={lang.code}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-4 py-3",
              isActive ? "bg-primary/10" : "bg-card",
            )}
            onPress={() => setLanguage(lang.code)}
          >
            <Text
              className={cn(
                "text-base",
                isActive ? "font-semibold text-primary" : "text-foreground",
              )}
            >
              {lang.label}
            </Text>
            {isActive && <Check size={18} color="#1e40af" />}
          </Pressable>
        );
      })}
    </View>
  );
}
