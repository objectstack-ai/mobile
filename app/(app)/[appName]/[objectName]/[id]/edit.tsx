import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useClient, useMutation } from "@objectstack/client-react";
import { useEffect, useState, useCallback } from "react";
import { FormViewRenderer } from "~/components/renderers";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useObjectMeta } from "~/hooks/useObjectMeta";

export default function EditRecordScreen() {
  const { objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { meta, fields } = useObjectMeta(objectName);
  const { mutate, isLoading: isSubmitting } = useMutation(objectName!, "update", {
    onSuccess: () => {
      router.back();
    },
  });

  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!objectName || !id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await client.data.get(objectName, id);
      setRecord(result.record ?? result);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load record",
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName, id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const displayName =
    meta?.label ??
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Record";

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={`Edit ${displayName}`} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={`Edit ${displayName}`} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-destructive">{loadError}</Text>
          <Pressable
            className="mt-4 rounded-xl bg-primary px-5 py-3"
            onPress={fetchRecord}
          >
            <Text className="font-semibold text-primary-foreground">Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={`Edit ${displayName}`} />
      <FormViewRenderer
        fields={fields}
        initialValues={record ?? {}}
        onSubmit={(values) => mutate({ id, data: values } as Record<string, unknown>)}
        onCancel={() => router.back()}
        isSubmitting={isSubmitting}
        submitLabel="Save"
      />
    </SafeAreaView>
  );
}
