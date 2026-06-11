import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@objectstack/client-react";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { FormViewRenderer } from "~/components/renderers";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { useObjectMeta } from "~/hooks/useObjectMeta";

export default function CreateRecordScreen() {
  const { objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { meta, fields } = useObjectMeta(objectName);
  const [dirty, setDirty] = useState(false);
  const { mutate, isLoading: isSubmitting } = useMutation(objectName!, "create", {
    onSuccess: () => {
      router.back();
    },
  });

  const displayName =
    meta?.label ??
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Record";

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title={t("records.newTitle", { name: displayName })}
        onBack={handleBack}
      />
      <FormViewRenderer
        fields={fields}
        onSubmit={(values) => mutate(values as Record<string, unknown>)}
        onCancel={goBack}
        onDirtyChange={setDirty}
        isSubmitting={isSubmitting}
        submitLabel={t("common.create")}
      />
    </SafeAreaView>
  );
}
