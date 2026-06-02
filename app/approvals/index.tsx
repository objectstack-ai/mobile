import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Inbox, Check, X } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { RejectReasonDialog } from "~/components/approvals/RejectReasonDialog";
import { formatDateTime } from "~/lib/formatting";
import {
  useApprovals,
  useDecideApproval,
  type ApprovalRequest,
} from "~/hooks/useApprovals";

function ApprovalCard({
  req,
  busy,
  onApprove,
  onReject,
}: {
  req: ApprovalRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-foreground">
          {req.process_name ?? t("approvals.title")}
        </Text>
        {req.current_step ? <Badge variant="secondary">{req.current_step}</Badge> : null}
      </View>
      {req.object_name && req.record_id ? (
        <Text className="mt-0.5 text-xs text-muted-foreground">
          {req.object_name} · {req.record_id}
        </Text>
      ) : null}
      {req.submitter_comment ? (
        <Text className="mt-2 text-sm text-foreground">{req.submitter_comment}</Text>
      ) : null}
      {req.created_at ? (
        <Text className="mt-2 text-xs text-muted-foreground">{formatDateTime(req.created_at)}</Text>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={onApprove}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${t("approvals.approve")} ${req.process_name ?? req.id}`}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 ${
            busy ? "opacity-50" : "active:opacity-80"
          }`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Check size={16} color="#ffffff" />
          )}
          <Text className="text-sm font-medium text-primary-foreground">
            {t("approvals.approve")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${t("approvals.reject")} ${req.process_name ?? req.id}`}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-destructive px-3 py-2.5 ${
            busy ? "opacity-50" : "active:bg-destructive/10"
          }`}
        >
          <X size={16} color="#dc2626" />
          <Text className="text-sm font-medium text-destructive">{t("approvals.reject")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Approvals inbox — lists the current user's pending approval requests and lets
 * them approve (with an optional comment) or reject (with a required reason).
 * Surfaces the previously-unused workflow approve/reject API.
 */
export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { data: requests, isLoading, error, refetch, isRefetching } = useApprovals();
  const { approve, reject, pendingId } = useDecideApproval();

  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);

  const count = requests?.length ?? 0;

  const handleApprove = async (req: ApprovalRequest) => {
    const ok = await confirm({
      title: t("approvals.approve"),
      message: t("approvals.approveConfirm", { name: req.process_name ?? req.id }),
      confirmLabel: t("approvals.approve"),
    });
    if (!ok) return;
    const res = await approve(req);
    if (res.ok) toastSuccess(t("approvals.approved"));
    else toastError(res.error ?? t("approvals.decisionFailed"));
  };

  const handleReject = async (reason: string) => {
    const req = rejectTarget;
    setRejectTarget(null);
    if (!req) return;
    const res = await reject(req, reason);
    if (res.ok) toastSuccess(t("approvals.rejected"));
    else toastError(res.error ?? t("approvals.decisionFailed"));
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title={t("approvals.title")}
        subtitle={count > 0 ? t("approvals.pendingCount", { count }) : undefined}
      />
      {isLoading ? (
        <ListSkeleton count={4} />
      ) : error ? (
        <EmptyState
          icon={Inbox}
          variant="error"
          title={t("approvals.loadError")}
          description={error.message}
          actionLabel={t("common.retry")}
          onAction={() => void refetch()}
          actionLoading={isRefetching}
        />
      ) : count === 0 ? (
        <EmptyState icon={Inbox} title={t("approvals.empty")} description={t("approvals.emptyHint")} />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 pt-4 pb-8">
          {requests!.map((req) => (
            <ApprovalCard
              key={req.id}
              req={req}
              busy={pendingId === req.id}
              onApprove={() => void handleApprove(req)}
              onReject={() => setRejectTarget(req)}
            />
          ))}
        </ScrollView>
      )}

      <RejectReasonDialog
        open={!!rejectTarget}
        isSubmitting={!!rejectTarget && pendingId === rejectTarget.id}
        onCancel={() => setRejectTarget(null)}
        onReject={(reason) => void handleReject(reason)}
      />
    </SafeAreaView>
  );
}
