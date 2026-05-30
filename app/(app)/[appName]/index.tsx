import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Inbox, ChevronRight } from "lucide-react-native";
import { Card, CardContent } from "~/components/ui/Card";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useApp, type NavigationItem } from "~/hooks/useApps";
import { getIcon } from "~/lib/getIcon";

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
      <Pressable
        key={item.id}
        disabled={!navigable}
        onPress={() => navigate(item)}
        className={navigable ? "" : "opacity-40"}
      >
        <Card>
          <CardContent className="flex-row items-center py-3.5">
            <View className="rounded-xl bg-primary/10 p-2.5">
              <Icon size={20} color="#1e40af" />
            </View>
            <Text className="ml-3 flex-1 text-base font-medium text-card-foreground">
              {item.label}
            </Text>
            {navigable ? <ChevronRight size={18} color="#94a3b8" /> : null}
          </CardContent>
        </Card>
      </Pressable>
    );
  };

  /** A group section: label header + its child leaves. */
  const renderGroup = (group: NavigationItem) => {
    const GroupIcon = getIcon(group.icon);
    return (
      <View key={group.id} className="mt-5">
        <View className="mb-2 flex-row items-center px-1">
          <GroupIcon size={14} color="#94a3b8" />
          <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
          <View className="flex-1 items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center pt-20">
            <Text className="text-base text-destructive">{error.message}</Text>
          </View>
        ) : navigation.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="rounded-2xl bg-muted p-6">
              <Inbox size={40} color="#94a3b8" />
            </View>
            <Text className="mt-5 text-lg font-semibold text-foreground">No Navigation</Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              This app hasn&apos;t published a navigation menu yet.
            </Text>
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
