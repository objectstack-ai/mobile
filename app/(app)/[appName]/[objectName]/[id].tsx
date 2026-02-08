import { SafeAreaView } from "react-native-safe-area-context";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useClient, useQuery, useObject, useView, useFields } from "@objectstack/client-react";
import { useEffect, useState, useCallback, useMemo } from "react";
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

  /* ---- Fetch sibling record list for navigation ---- */
  const { data: listData } = useQuery(objectName!, {
    top: 200,
    enabled: !!objectName,
  });
  const recordIds: string[] = useMemo(
    () =>
      (listData?.records ?? []).map(
        (r: Record<string, unknown>) => String(r.id ?? r._id ?? ""),
      ),
    [listData],
  );
  const currentIndex = recordIds.indexOf(id!);

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

  /* ---- Navigation handlers ---- */
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < recordIds.length - 1;

  const navigateToRecord = useCallback(
    (targetId: string) => {
      router.replace(`/(app)/${appName}/${objectName}/${targetId}` as any);
    },
    [router, appName, objectName],
  );

  const handlePrevious = useCallback(() => {
    if (hasPrevious) navigateToRecord(recordIds[currentIndex - 1]);
  }, [hasPrevious, navigateToRecord, recordIds, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext) navigateToRecord(recordIds[currentIndex + 1]);
  }, [hasNext, navigateToRecord, recordIds, currentIndex]);

  const positionLabel =
    currentIndex >= 0 ? `${currentIndex + 1} of ${recordIds.length}` : undefined;

  /* ---- Delete handler ---- */
  const handleDelete = useCallback(() => {
    Alert.alert("Delete Record", "Are you sure you want to delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.data.delete(objectName!, id!);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete the record.");
          }
        },
      },
    ]);
  }, [client, objectName, id, router]);

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
        onDelete={handleDelete}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        positionLabel={positionLabel}
      />
    </SafeAreaView>
  );
}
