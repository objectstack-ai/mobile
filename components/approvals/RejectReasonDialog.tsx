import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Dialog } from "~/components/ui/Dialog";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";

export interface RejectReasonDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  /** Confirm rejection with the entered (non-empty) reason. */
  onReject: (reason: string) => void;
}

/**
 * Collects the required rejection reason before rejecting an approval request.
 * Cross-platform (Dialog/Modal), so it works on web and native.
 */
export function RejectReasonDialog({
  open,
  isSubmitting = false,
  onCancel,
  onReject,
}: RejectReasonDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (!o ? onCancel() : undefined)}
      title={t("approvals.reject")}
      description={t("approvals.rejectReason")}
    >
      <Input
        value={reason}
        onChangeText={setReason}
        placeholder={t("approvals.rejectReasonPlaceholder")}
        multiline
        className="min-h-[80px]"
        autoFocus
      />
      <View className="mt-4 flex-row justify-end gap-3">
        <Button variant="outline" onPress={onCancel} disabled={isSubmitting} className="flex-1">
          {t("common.cancel")}
        </Button>
        <Button
          variant="destructive"
          onPress={() => onReject(trimmed)}
          disabled={trimmed.length === 0}
          loading={isSubmitting}
          className="flex-1"
        >
          {t("approvals.reject")}
        </Button>
      </View>
    </Dialog>
  );
}
