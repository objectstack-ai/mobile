import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { LayoutGrid, RefreshCw, ChevronRight } from "lucide-react-native";
import { Card, CardContent } from "~/components/ui/Card";
import { useApps } from "~/hooks/useApps";
import { getIcon } from "~/lib/getIcon";
import { getUserErrorMessage } from "~/lib/error-handling";

export default function AppsScreen() {
  const { apps, isLoading, error, refetch } = useApps();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAppPress = (appName: string) => {
    router.push(`/(app)/${appName}`);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-4 text-sm text-muted-foreground">Loading apps…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="rounded-2xl bg-muted p-6">
            <LayoutGrid size={40} color="#94a3b8" />
          </View>
          <Text className="mt-5 text-lg font-semibold text-foreground">
            Unable to Load Apps
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            {getUserErrorMessage(error)}
          </Text>
          <Pressable
            className="mt-6 flex-row items-center rounded-xl bg-primary px-5 py-3"
            onPress={refetch}
          >
            <RefreshCw size={16} color="#ffffff" />
            <Text className="ml-2 font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (apps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4">
          <View className="flex-1 items-center justify-center pt-20">
            <View className="rounded-2xl bg-muted p-6">
              <LayoutGrid size={40} color="#94a3b8" />
            </View>
            <Text className="mt-5 text-lg font-semibold text-foreground">No Apps</Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              Your enterprise applications will appear here once installed.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#1e40af" />
        }
      >
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">Apps</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {apps.length} app{apps.length !== 1 ? "s" : ""} installed
          </Text>
        </View>

        <View className="gap-3">
          {apps.map((app) => {
            const Icon = getIcon(app.icon);
            return (
              <Pressable key={app.name} onPress={() => handleAppPress(app.name)}>
                <Card>
                  <CardContent className="flex-row items-center py-4">
                    <View className="rounded-xl bg-primary/10 p-3">
                      <Icon size={24} color="#1e40af" />
                    </View>
                    <View className="ml-4 flex-1">
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
                  </CardContent>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
