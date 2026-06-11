import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { webContentMaxWidth } from "~/lib/responsive";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { LayoutGrid, ChevronRight } from "lucide-react-native";
import { PressableCard } from "~/components/ui/PressableCard";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useApps } from "~/hooks/useApps";
import { getIcon } from "~/lib/getIcon";
import { getUserErrorMessage } from "~/lib/error-handling";
import { tCount } from "~/lib/i18n";
import { useThemeColors } from "~/lib/theme-colors";

export default function AppsScreen() {
  const { apps, isLoading, error, refetch } = useApps();
  const router = useRouter();
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAppPress = (appName: string) => {
    router.push(`/(app)/${appName}`);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const showSkeleton = isLoading && !isRefreshing;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        contentContainerStyle={webContentMaxWidth}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1e40af" />
        }
      >
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">{t("apps.title")}</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {showSkeleton
              ? t("apps.loading")
              : tCount("apps.installed", apps.length)}
          </Text>
        </View>

        {showSkeleton ? (
          <ListSkeleton count={5} />
        ) : error ? (
          <View className="pt-24">
            <EmptyState
              icon={LayoutGrid}
              variant="error"
              title={t("apps.loadErrorTitle")}
              description={getUserErrorMessage(error)}
              actionLabel={t("common.retry")}
              onAction={refetch}
            />
          </View>
        ) : apps.length === 0 ? (
          <View className="pt-24">
            <EmptyState
              icon={LayoutGrid}
              title={t("apps.emptyTitle")}
              description={t("apps.emptyDesc")}
            />
          </View>
        ) : (
          <View className="gap-3">
            {apps.map((app) => {
              const Icon = getIcon(app.icon);
              return (
                <PressableCard
                  key={app.name}
                  className="flex-row items-center p-4"
                  onPress={() => handleAppPress(app.name)}
                  accessibilityRole="button"
                  accessibilityLabel={t("apps.openA11y", { name: app.label })}
                >
                  <View className="rounded-xl bg-primary/10 p-3">
                    <Icon size={24} color={accent} />
                  </View>
                  <View className="ms-4 flex-1">
                    <Text className="text-base font-semibold text-card-foreground">
                      {app.label}
                    </Text>
                    {app.description ? (
                      <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                        {app.description}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={20} color="#94a3b8" />
                </PressableCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
