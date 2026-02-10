import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useFields, useMutation } from "@objectstack/client-react";
import { FormViewRenderer } from "~/components/renderers";
import type { FieldDefinition } from "~/components/renderers";

export default function CreateRecordScreen() {
  const { objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const router = useRouter();
  const { data: fieldsData } = useFields(objectName!);
  const { mutate, isLoading: isSubmitting } = useMutation(objectName!, "create", {
    onSuccess: () => {
      router.back();
    },
  });

  const displayName =
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Record";

  const fields: FieldDefinition[] = fieldsData ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <Stack.Screen options={{ title: `New ${displayName}` }} />
      <FormViewRenderer
        fields={fields}
        onSubmit={(values) => mutate(values as Record<string, unknown>)}
        onCancel={() => router.back()}
        isSubmitting={isSubmitting}
        submitLabel="Create"
      />
    </SafeAreaView>
  );
}
