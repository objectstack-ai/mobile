import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useClient, useQuery, useView } from "@objectstack/client-react";
import { useTranslation } from "react-i18next";
import { tCount } from "~/lib/i18n";
import { useCallback, useState } from "react";
import { ListViewRenderer } from "~/components/renderers";
import type { ListViewMeta } from "~/components/renderers";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { useObjectMeta } from "~/hooks/useObjectMeta";
import { useThemeColors } from "~/lib/theme-colors";

export default function ObjectListScreen() {
  const { appName, objectName } = useLocalSearchParams<{
    appName: string;
    objectName: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const { toastError } = useToast();
  const confirm = useConfirm();

  const { data: viewData, isLoading: viewLoading } = useView(objectName!, "list");
  const { meta, fields } = useObjectMeta(objectName);

  const [filter, setFilter] = useState<unknown>(null);
  const { data, isLoading, error, refetch } = useQuery(objectName!, {
    top: 50,
    filters: filter || undefined,
    enabled: !!objectName,
  });

  // Prefer the object's real plural label/label from metadata; fall back to a
  // title-cased version of the snake_case object name.
  const displayName =
    meta?.pluralLabel ??
    meta?.label ??
    objectName?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Objects";

  const records = data?.records ?? [];
  const listView: ListViewMeta | undefined = viewData ?? undefined;

  const handleSwipeEdit = useCallback(
    (record: Record<string, unknown>) => {
      const id = (record.id ?? record._id) as string;
      router.push(`/(app)/${appName}/${objectName}/${id}/edit` as never);
    },
    [router, appName, objectName],
  );

  const handleSwipeDelete = useCallback(
    async (record: Record<string, unknown>) => {
      const id = (record.id ?? record._id) as string;
      const label = (record.name ?? record.label ?? record.title ?? id) as string;
      const ok = await confirm({
        title: t("records.deleteRecord"),
        message: t("records.deleteConfirmNamed", { label }),
        confirmLabel: t("common.delete"),
        destructive: true,
      });
      if (!ok) return;
      try {
        await client.data.delete(objectName!, id);
        refetch();
      } catch {
        toastError(t("records.deleteFailed"));
      }
    },
    [confirm, client, objectName, refetch, t, toastError],
  );

  const handleFilterChange = useCallback((f: unknown) => {
    setFilter(f);
  }, []);

  const handleCreate = useCallback(() => {
    router.push(`/(app)/${appName}/${objectName}/new` as never);
  }, [router, appName, objectName]);

  const recordCount = records.length;
  const countLabel = isLoading
    ? undefined
    : tCount("records.recordCount", recordCount);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title={displayName}
        subtitle={countLabel}
        right={
          <Pressable
            onPress={handleCreate}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("records.createNamed", { name: displayName })}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
          >
            <Plus size={24} color={accent} />
          </Pressable>
        }
      />
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
