import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useClient, useMutation } from "@objectstack/client-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { AlertCircle } from "lucide-react-native";
import { FormViewRenderer } from "~/components/renderers";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { useObjectMeta } from "~/hooks/useObjectMeta";

export default function EditRecordScreen() {
  const { objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { meta, fields } = useObjectMeta(objectName);
  const [dirty, setDirty] = useState(false);
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
  const title = t("records.editTitle", { name: displayName });

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/apps");
  }, [router]);

  // Header back bypasses the form's own Cancel guard, so confirm here too.
  const handleBack = useCallback(async () => {
    if (dirty) {
      const ok = await confirm({
        title: t("records.discardTitle"),
        message: t("records.discardMessage"),
        confirmLabel: t("common.discard"),
        cancelLabel: t("common.cancel"),
        destructive: true,
      });
      if (!ok) return;
    }
    goBack();
  }, [dirty, confirm, t, goBack]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={title} />
        <View className="px-4 pt-4">
          <ListSkeleton count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={title} />
        <EmptyState
          icon={AlertCircle}
          variant="error"
          title={t("records.loadOneError")}
          description={loadError}
          actionLabel={t("common.retry")}
          onAction={fetchRecord}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={title} onBack={handleBack} />
      <FormViewRenderer
        fields={fields}
        initialValues={record ?? {}}
        onSubmit={(values) => mutate({ id, data: values } as Record<string, unknown>)}
        onCancel={goBack}
        onDirtyChange={setDirty}
        isSubmitting={isSubmitting}
        submitLabel={t("common.save")}
      />
    </SafeAreaView>
  );
}
