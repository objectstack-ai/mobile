import { SafeAreaView } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useClient, useFields, useMutation } from "@objectstack/client-react";
import { useEffect, useState, useCallback } from "react";
import { FormViewRenderer } from "~/components/renderers";
import type { FieldDefinition } from "~/components/renderers";

export default function EditRecordScreen() {
  const { appName, objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { data: fieldsData } = useFields(objectName!);
  const { mutate, isLoading: isSubmitting } = useMutation(objectName!, "update", {
    onSuccess: () => {
      router.back();
    },
  });

  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecord = useCallback(async () => {
    if (!objectName || !id) return;
    setIsLoading(true);
    try {
      const result = await client.data.get(objectName, id);
      setRecord(result.record ?? result);
    } catch {
      // Error is non-critical — form will still render empty
    } finally {
      setIsLoading(false);
    }
  }, [client, objectName, id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const displayName =
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Record";

  const fields: FieldDefinition[] = fieldsData ?? [];

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <Stack.Screen options={{ title: `Edit ${displayName}` }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: `Edit ${displayName}` }} />
      <FormViewRenderer
        fields={fields}
        initialValues={record ?? {}}
        onSubmit={(values) => mutate({ id, data: values } as any)}
        onCancel={() => router.back()}
        isSubmitting={isSubmitting}
        submitLabel="Save"
      />
    </SafeAreaView>
  );
}
