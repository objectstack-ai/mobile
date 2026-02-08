import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { useClient, useObject } from "@objectstack/client-react";
import { useEffect, useState, useCallback } from "react";

export default function ObjectDetailScreen() {
  const { objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const { data: schema } = useObject(objectName!);

  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!objectName || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.data.get(objectName, id);
      setRecord(result.record ?? result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load record"));
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName, id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const displayName =
    record?.name ?? record?.label ?? record?.title ?? record?.subject ?? "Record Detail";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: String(displayName) }} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-destructive">{error.message}</Text>
          <Pressable
            className="mt-4 rounded-xl bg-primary px-5 py-3"
            onPress={fetchRecord}
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      ) : record ? (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4">
          <View className="gap-4">
            {Object.entries(record)
              .filter(([key]) => !key.startsWith("_") && key !== "id")
              .map(([key, value]) => {
                const fieldLabel = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <View key={key} className="rounded-xl border border-border bg-card p-4">
                    <Text className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {fieldLabel}
                    </Text>
                    <Text className="mt-1 text-base text-card-foreground">
                      {value != null ? String(value) : "—"}
                    </Text>
                  </View>
                );
              })}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
