import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useView, useFields } from "@objectstack/client-react";
import { ListViewRenderer } from "~/components/renderers";
import type { FieldDefinition, ListViewMeta } from "~/components/renderers";

export default function ObjectListScreen() {
  const { appName, objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const router = useRouter();

  const { data: viewData, isLoading: viewLoading } = useView(objectName!, "list");
  const { data: fieldsData } = useFields(objectName!);
  const { data, isLoading, error, refetch } = useQuery(objectName!, {
    top: 50,
    enabled: !!objectName,
  });

  const displayName =
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Objects";

  const records = data?.records ?? [];
  const fields: FieldDefinition[] = fieldsData ?? [];
  const listView: ListViewMeta | undefined = viewData ?? undefined;

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
      />
    </SafeAreaView>
  );
}
