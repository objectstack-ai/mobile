import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { BottomSheet } from "~/components/ui/BottomSheet";
import { getIcon } from "~/lib/getIcon";
import type { AppMeta, NavigationItem } from "~/hooks/useApps";

interface CreatableObject {
  appId: string;
  appLabel: string;
  object: string;
  label: string;
  icon?: string;
}

/**
 * Flatten every app's navigation tree into its creatable objects. `group`
 * items are walked recursively; the first occurrence of an `app/object` pair
 * wins (an object surfaced under several views appears once).
 */
function collectObjects(apps: AppMeta[]): CreatableObject[] {
  const out: CreatableObject[] = [];
  const seen = new Set<string>();
  const walk = (app: AppMeta, items: NavigationItem[]) => {
    for (const item of items) {
      if (item.type === "group") {
        walk(app, item.children ?? []);
        continue;
      }
      if (item.type === "object" && item.objectName) {
        const key = `${app.name}/${item.objectName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          appId: app.name,
          appLabel: app.label,
          object: item.objectName,
          label: item.label,
          icon: item.icon,
        });
      }
    }
  };
  apps.forEach((app) => walk(app, app.navigation ?? []));
  return out;
}

/**
 * Global quick-create — a sheet listing every creatable object across the
 * installed apps. Picking one opens its blank create form.
 */
export function QuickCreateSheet({
  open,
  onOpenChange,
  apps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apps: AppMeta[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const accent = colorScheme === "dark" ? "#60a5fa" : "#1e40af";
  const objects = useMemo(() => collectObjects(apps), [apps]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("home.quickCreateTitle")}
    >
      {objects.length === 0 ? (
        <Text className="px-3 py-6 text-center text-sm text-muted-foreground">
          {t("home.quickCreateEmpty")}
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {objects.map((o) => {
            const Icon = getIcon(o.icon);
            return (
              <Pressable
                key={`${o.appId}/${o.object}`}
                className="flex-row items-center rounded-lg px-2 py-3 active:bg-muted"
                accessibilityRole="button"
                accessibilityLabel={o.label}
                onPress={() => {
                  onOpenChange(false);
                  // Dynamic route — expo-router's typed routes can't express the
                  // computed object path, so cast (matches the detail screens).
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  router.push(`/(app)/${o.appId}/${o.object}/new` as any);
                }}
              >
                <View className="rounded-lg bg-primary/10 p-2">
                  <Icon size={18} color={accent} />
                </View>
                <View className="ms-3 flex-1">
                  <Text className="text-base text-foreground">{o.label}</Text>
                  <Text className="text-xs text-muted-foreground">{o.appLabel}</Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
}
