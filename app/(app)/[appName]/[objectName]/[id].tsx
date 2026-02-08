import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useClient, useObject, useView, useFields } from "@objectstack/client-react";
import { useEffect, useState, useCallback } from "react";
import { DetailViewRenderer } from "~/components/renderers";
import type { FieldDefinition, FormViewMeta } from "~/components/renderers";

export default function ObjectDetailScreen() {
  const { appName, objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { data: schema } = useObject(objectName!);
  const { data: viewData } = useView(objectName!, "form");
  const { data: fieldsData } = useFields(objectName!);

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

  const fields: FieldDefinition[] = fieldsData ?? [];
  const formView: FormViewMeta | undefined = viewData ?? undefined;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: String(displayName) }} />
      <DetailViewRenderer
        view={formView}
        fields={fields}
        record={record}
        isLoading={isLoading}
        error={error}
        onRetry={fetchRecord}
        onEdit={() =>
          router.push(`/(app)/${appName}/${objectName}/${id}/edit` as any)
        }
      />
    </SafeAreaView>
  );
}
