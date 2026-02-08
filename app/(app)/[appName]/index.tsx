import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { List, FileText } from "lucide-react-native";
import { useClient } from "@objectstack/client-react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "~/components/ui/Card";

interface ObjectMeta {
  name: string;
  label?: string;
  description?: string;
}

export default function AppHomeScreen() {
  const { appName } = useLocalSearchParams<{ appName: string }>();
  const client = useClient();
  const router = useRouter();
  const [objects, setObjects] = useState<ObjectMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchObjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.meta.getItems("object", { packageId: appName });
      const items: ObjectMeta[] = Array.isArray(result?.items)
        ? result.items.map((item: any) => ({
            name: item.name,
            label: item.label ?? item.name,
            description: item.description,
          }))
        : [];
      setObjects(items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load objects"));
    } finally {
      setIsLoading(false);
    }
  }, [client, appName]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const displayName = appName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "App";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: displayName }} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#1e40af" />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center pt-20">
            <Text className="text-base text-destructive">{error.message}</Text>
          </View>
        ) : objects.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-20">
            <View className="rounded-2xl bg-muted p-6">
              <FileText size={40} color="#94a3b8" />
            </View>
            <Text className="mt-5 text-lg font-semibold text-foreground">No Objects</Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              This app has no objects configured yet.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {objects.map((obj) => (
              <Pressable
                key={obj.name}
                onPress={() => router.push(`/(app)/${appName}/${obj.name}`)}
              >
                <Card>
                  <CardContent className="flex-row items-center py-4">
                    <View className="rounded-xl bg-primary/10 p-3">
                      <List size={24} color="#1e40af" />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-base font-semibold text-card-foreground">
                        {obj.label}
                      </Text>
                      {obj.description ? (
                        <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                          {obj.description}
                        </Text>
                      ) : null}
                    </View>
                  </CardContent>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
