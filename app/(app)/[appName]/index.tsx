import { View, Text, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Inbox, ChevronRight, AlertCircle } from "lucide-react-native";
import { PressableCard } from "~/components/ui/PressableCard";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useApp, type NavigationItem } from "~/hooks/useApps";
import { getIcon } from "~/lib/getIcon";
import { useThemeColors } from "~/lib/theme-colors";

/**
 * App home — renders the app's curated navigation tree (the same
 * `App.navigation` the web console's sidebar consumes), grouped into sections
 * with proper labels and icons. Tapping a leaf opens the target object list,
 * dashboard, page, or external URL. (Previously this dumped every raw object in
 * the package as flat cards.)
 */
export default function AppHomeScreen() {
  const { appName } = useLocalSearchParams<{ appName: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const { app, isLoading, error } = useApp(appName);

  const displayName =
    app?.label ??
    appName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "App";

  /** Open the route for a leaf navigation item based on its type. */
  const navigate = (item: NavigationItem) => {
    switch (item.type) {
      case "object":
        if (item.objectName) {
          const query = item.viewName ? `?view=${encodeURIComponent(item.viewName)}` : "";
          router.push(`/(app)/${appName}/${item.objectName}${query}`);
        }
        break;
      case "dashboard":
        if (item.dashboardName) {
          router.push(`/(app)/${appName}/dashboard/${item.dashboardName}`);
        }
        break;
      case "page":
        if (item.pageName) router.push(`/(app)/page/${item.pageName}`);
        break;
      case "url":
        if (item.url) void Linking.openURL(item.url);
        break;
      // 'report' has no mobile screen yet — rendered but not navigable.
    }
  };

  const isNavigable = (item: NavigationItem) =>
    (item.type === "object" && !!item.objectName) ||
    (item.type === "dashboard" && !!item.dashboardName) ||
    (item.type === "page" && !!item.pageName) ||
    (item.type === "url" && !!item.url);

  /** A single leaf row (icon + label), navigable or muted. */
  const renderLeaf = (item: NavigationItem) => {
    const Icon = getIcon(item.icon);
    const navigable = isNavigable(item);
    return (
      <PressableCard
        key={item.id}
        disabled={!navigable}
        haptic={navigable}
        onPress={() => navigate(item)}
        className={`flex-row items-center p-3.5 ${navigable ? "" : "opacity-40"}`}
        accessibilityRole={navigable ? "button" : undefined}
        accessibilityLabel={item.label}
      >
        <View className="rounded-xl bg-primary/10 p-2.5">
          <Icon size={20} color={accent} />
        </View>
        <Text className="ms-3 flex-1 text-base font-medium text-card-foreground">
          {item.label}
        </Text>
        {navigable ? <ChevronRight size={18} color="#94a3b8" /> : null}
      </PressableCard>
    );
  };

  /** A group section: label header + its child leaves. */
  const renderGroup = (group: NavigationItem) => {
    const GroupIcon = getIcon(group.icon);
    return (
      <View key={group.id} className="mt-5">
        <View className="mb-2 flex-row items-center px-1">
          <GroupIcon size={14} color="#94a3b8" />
          <Text className="ms-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </Text>
        </View>
        <View className="gap-2">
          {(group.children ?? []).map(renderLeaf)}
        </View>
      </View>
    );
  };

  const navigation = app?.navigation ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={displayName} backFallback="/(tabs)/apps" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-2">
        {isLoading ? (
          <View className="pt-3">
            <ListSkeleton count={6} />
          </View>
        ) : error ? (
          <View className="pt-20">
            <EmptyState
              icon={AlertCircle}
              variant="error"
              title={t("empty.loadApp")}
              description={error.message}
            />
          </View>
        ) : navigation.length === 0 ? (
          <View className="pt-20">
            <EmptyState
              icon={Inbox}
              title={t("empty.appNavTitle")}
              description={t("empty.appNavDesc")}
            />
          </View>
        ) : (
          <View>
            {/* Top-level leaves (e.g. Home dashboard) render first, then groups. */}
            <View className="gap-2">
              {navigation.filter((item) => item.type !== "group").map(renderLeaf)}
            </View>
            {navigation.filter((item) => item.type === "group").map(renderGroup)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
