import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react-native";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { RejectReasonDialog } from "./RejectReasonDialog";
import { useDecideApproval, type ApprovalRequest } from "~/hooks/useApprovals";

export interface ApprovalActionsProps {
  req: ApprovalRequest;
  /** Called after a successful approve/reject (e.g. to navigate back). */
  onDecided?: () => void;
}

/**
 * Approve / reject buttons for one request, with the confirm + reject-reason
 * dialogs and toasts. Shared by the inbox card and the approval detail screen so
 * the decision flow is identical everywhere.
 */
export function ApprovalActions({ req, onDecided }: ApprovalActionsProps) {
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { approve, reject, pendingId } = useDecideApproval();
  const [rejecting, setRejecting] = React.useState(false);

  const busy = pendingId === req.id;

  const handleApprove = async () => {
    const ok = await confirm({
      title: t("approvals.approve"),
      message: t("approvals.approveConfirm", { name: req.process_name ?? req.id }),
      confirmLabel: t("approvals.approve"),
    });
    if (!ok) return;
    const res = await approve(req);
    if (res.ok) {
      toastSuccess(t("approvals.approved"));
      onDecided?.();
    } else {
      toastError(res.error ?? t("approvals.decisionFailed"));
    }
  };

  const handleReject = async (reason: string) => {
    setRejecting(false);
    const res = await reject(req, reason);
    if (res.ok) {
      toastSuccess(t("approvals.rejected"));
      onDecided?.();
    } else {
      toastError(res.error ?? t("approvals.decisionFailed"));
    }
  };

  return (
    <>
      <View className="flex-row gap-2">
        <Pressable
          onPress={handleApprove}
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
          onPress={() => setRejecting(true)}
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

      <RejectReasonDialog
        open={rejecting}
        isSubmitting={busy}
        onCancel={() => setRejecting(false)}
        onReject={(reason) => void handleReject(reason)}
      />
    </>
  );
}
