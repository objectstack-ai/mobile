import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useView } from "@objectstack/client-react";

export default function ObjectListScreen() {
  const { appName, objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const router = useRouter();

  const { data: viewData, isLoading: viewLoading } = useView(objectName!, "list");
  const { data, isLoading, error, refetch } = useQuery(objectName!, {
    top: 50,
    enabled: !!objectName,
  });

  const displayName =
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Objects";

  const records = data?.records ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: displayName }} />
      {isLoading || viewLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-destructive">{error.message}</Text>
          <Pressable
            className="mt-4 rounded-xl bg-primary px-5 py-3"
            onPress={refetch}
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item: any, index: number) => item.id ?? item._id ?? String(index)}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }: { item: any }) => (
            <Pressable
              className="mb-2 rounded-xl border border-border bg-card p-4"
              onPress={() =>
                router.push(`/(app)/${appName}/${objectName}/${item.id ?? item._id}`)
              }
            >
              <Text className="text-base font-medium text-card-foreground">
                {item.name ?? item.label ?? item.title ?? item.subject ?? item.id ?? "Record"}
              </Text>
              {item.description ? (
                <Text className="mt-1 text-sm text-muted-foreground" numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-lg font-semibold text-foreground">No Records</Text>
              <Text className="mt-2 text-sm text-muted-foreground">
                No records found for this object.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
