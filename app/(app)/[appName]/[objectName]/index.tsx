import { SafeAreaView } from "react-native-safe-area-context";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useClient, useQuery, useView, useFields } from "@objectstack/client-react";
import { useCallback, useState } from "react";
import { ListViewRenderer } from "~/components/renderers";
import type { FieldDefinition, ListViewMeta } from "~/components/renderers";

export default function ObjectListScreen() {
  const { appName, objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const client = useClient();
  const router = useRouter();

  const { data: viewData, isLoading: viewLoading } = useView(objectName!, "list");
  const { data: fieldsData } = useFields(objectName!);

  const [filter, setFilter] = useState<unknown>(null);
  const { data, isLoading, error, refetch } = useQuery(objectName!, {
    top: 50,
    filters: filter || undefined,
    enabled: !!objectName,
  });

  const displayName =
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Objects";

  const records = data?.records ?? [];
  const fields: FieldDefinition[] = fieldsData ?? [];
  const listView: ListViewMeta | undefined = viewData ?? undefined;

  const handleSwipeEdit = useCallback(
    (record: Record<string, unknown>) => {
      const id = (record.id ?? record._id) as string;
      router.push(`/(app)/${appName}/${objectName}/${id}/edit` as any);
    },
    [router, appName, objectName],
  );

  const handleSwipeDelete = useCallback(
    (record: Record<string, unknown>) => {
      const id = (record.id ?? record._id) as string;
      const label = (record.name ?? record.label ?? record.title ?? id) as string;
      Alert.alert("Delete Record", `Are you sure you want to delete "${label}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await client.data.delete(objectName!, id);
              refetch();
            } catch {
              Alert.alert("Error", "Failed to delete the record.");
            }
          },
        },
      ]);
    },
    [client, objectName, refetch],
  );

  const handleFilterChange = useCallback((f: unknown) => {
    setFilter(f);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: displayName }} />
      <ListViewRenderer
        view={listView}
        fields={fields}
        records={records}
        isLoading={isLoading || viewLoading}
        error={error}
        onRefresh={refetch}
        onRowPress={(record) =>
          router.push(
            `/(app)/${appName}/${objectName}/${(record.id ?? record._id) as string}`,
          )
        }
        showFilter={fields.length > 0}
        onFilterChange={handleFilterChange}
        onSwipeEdit={handleSwipeEdit}
        onSwipeDelete={handleSwipeDelete}
      />
    </SafeAreaView>
  );
}
