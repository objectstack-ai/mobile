import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useClient, useQuery, useView } from "@objectstack/client-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback, useMemo } from "react";
import { DetailViewRenderer } from "~/components/renderers";
import type { FormViewMeta, ActionMeta } from "~/components/renderers";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { useObjectMeta } from "~/hooks/useObjectMeta";
import { useRecordActions } from "~/hooks/useRecordActions";
import { useRelatedLists } from "~/hooks/useRelatedLists";
import {
  useRecordStateMachines,
  type RecordStateMachine,
  type SMTransition,
} from "~/hooks/useStateMachines";
import { RecordStateMachines } from "~/components/workflow/RecordStateMachines";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { isActionVisible } from "~/lib/record-actions";
import { renderRecordTitle } from "~/lib/record-title";
import { useRecentStore } from "~/stores/recent-store";

export default function ObjectDetailScreen() {
  const { appName, objectName, id } = useLocalSearchParams<{
    appName: string;
    objectName: string;
    id: string;
  }>();
  const client = useClient();
  const router = useRouter();
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { data: viewData } = useView(objectName!, "form");
  const { meta, fields } = useObjectMeta(objectName);

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

  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
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

  const displayName = renderRecordTitle(meta, record, "Record Detail");

  // Remember this record for the Home "Recent" section once it has loaded.
  const trackRecent = useRecentStore((s) => s.track);
  useEffect(() => {
    if (!record || !objectName || !id || !appName) return;
    trackRecent({
      appId: appName,
      object: objectName,
      recordId: id,
      title: String(displayName),
      subtitle: meta?.label as string | undefined,
    });
  }, [record, objectName, id, appName, displayName, meta, trackRecent]);

  const formView: FormViewMeta | undefined = viewData ?? undefined;

  /* ---- Navigation handlers ---- */
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < recordIds.length - 1;

  const navigateToRecord = useCallback(
    (targetId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const handleDelete = useCallback(async () => {
    const ok = await confirm({
      title: t("records.deleteRecord"),
      message: t("records.deleteConfirm"),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await client.data.delete(objectName!, id!);
      router.back();
    } catch {
      toastError(t("records.deleteFailed"));
    }
  }, [confirm, client, objectName, id, router, t, toastError]);

  /* ---- Object actions (record_header inline, record_more overflow) ---- */
  const allActions = useMemo<ActionMeta[]>(
    () => ((meta?.actions as ActionMeta[] | undefined) ?? []).filter(isActionVisible),
    [meta],
  );
  const headerActions = useMemo(
    () =>
      allActions.filter(
        (a) => !a.locations || a.locations.includes("record_header"),
      ),
    [allActions],
  );
  const moreActions = useMemo(
    () => allActions.filter((a) => a.locations?.includes("record_more")),
    [allActions],
  );

  const { runAction, busyName, modals } = useRecordActions({
    client,
    objectName: objectName!,
    recordId: id!,
    record,
    onRefresh: fetchRecord,
  });

  /* ---- Related lists (8.0): child records referencing this one ---- */
  const { relatedLists } = useRelatedLists(client, objectName, record ? id : undefined);
  const handleRelatedRecordPress = useCallback(
    (childObject: string, rec: Record<string, unknown>) => {
      const childId = String(rec.id ?? rec._id ?? "");
      if (!childId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push(`/(app)/${appName}/${childObject}/${childId}` as any);
    },
    [router, appName],
  );

  /* ---- Lifecycle / state machine diagram(s) ---- */
  const stateMachines = useRecordStateMachines(meta, fields, record);
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);

  const handleTransition = useCallback(
    async (machine: RecordStateMachine, transition: SMTransition) => {
      if (!machine.field || !objectName || !id) return;
      const toLabel =
        machine.states.find((s) => s.name === transition.to)?.label ?? transition.to;
      const ok = await confirm({
        title: t("workflow.updateStatus"),
        message: t("workflow.moveToConfirm", { state: toLabel }),
      });
      if (!ok) return;
      setPendingEvent(`${machine.key}:${transition.event}`);
      try {
        await client.data.update(objectName, id, {
          [machine.field]: transition.to,
        });
        await fetchRecord();
        toastSuccess(t("workflow.statusUpdated"));
      } catch {
        toastError(t("workflow.statusUpdateFailed"));
      } finally {
        setPendingEvent(null);
      }
    },
    [confirm, client, objectName, id, t, fetchRecord, toastSuccess, toastError],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={String(displayName)} subtitle={positionLabel} />
      <DetailViewRenderer
        view={formView}
        fields={fields}
        record={record}
        isLoading={isLoading}
        error={error}
        onRetry={fetchRecord}
        onEdit={() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          router.push(`/(app)/${appName}/${objectName}/${id}/edit` as any)
        }
        onDelete={handleDelete}
        actions={headerActions}
        moreActions={moreActions}
        onAction={runAction}
        busyActionName={busyName}
        relatedLists={relatedLists}
        onRelatedRecordPress={handleRelatedRecordPress}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        positionLabel={positionLabel}
        footer={
          stateMachines.length > 0 ? (
            <RecordStateMachines
              machines={stateMachines}
              onTransition={handleTransition}
              pendingEvent={pendingEvent}
            />
          ) : undefined
        }
      />
      {modals}
    </SafeAreaView>
  );
}
