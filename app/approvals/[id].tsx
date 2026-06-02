import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { ApprovalActions } from "~/components/approvals/ApprovalActions";
import { ApprovalTargetCard } from "~/components/approvals/ApprovalTargetCard";
import { useObjectMeta } from "~/hooks/useObjectMeta";
import { useApproval, useApprovalTarget } from "~/hooks/useApprovals";
import { formatDateTime } from "~/lib/formatting";

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Approval detail — review the record under approval (title + key fields) and
 * the request context before approving or rejecting.
 */
export default function ApprovalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const approvalId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { t } = useTranslation();

  const { data: req, isLoading, error } = useApproval(approvalId);
  const { meta, fields } = useObjectMeta(req?.object_name);
  const { record: target, isLoading: targetLoading } = useApprovalTarget(req);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={t("approvals.title")} backFallback="/approvals" />
        <ListSkeleton count={4} />
      </SafeAreaView>
    );
  }

  if (error || !req) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={t("approvals.title")} backFallback="/approvals" />
        <EmptyState
          icon={Inbox}
          variant={error ? "error" : "default"}
          title={t("approvals.loadError")}
          description={error?.message}
        />
      </SafeAreaView>
    );
  }

  const objectLabel = meta?.label ?? (req.object_name ? humanize(req.object_name) : "Record");
  const isPending = (req.status ?? "pending") === "pending";

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={req.process_name ?? t("approvals.title")} backFallback="/approvals" />

      <ScrollView className="flex-1" contentContainerClassName="px-4 pt-4 pb-8">
        {/* Request context */}
        <View className="mb-4 rounded-xl border border-border bg-card p-4">
          <View className="flex-row flex-wrap items-center gap-2">
            {req.current_step ? <Badge variant="secondary">{req.current_step}</Badge> : null}
            <Badge variant={isPending ? "outline" : "default"}>
              {req.status ? humanize(req.status) : humanize("pending")}
            </Badge>
          </View>
          {req.submitter_comment ? (
            <Text className="mt-2 text-sm text-foreground">{req.submitter_comment}</Text>
          ) : null}
          {req.created_at ? (
            <Text className="mt-2 text-xs text-muted-foreground">
              {formatDateTime(req.created_at)}
            </Text>
          ) : null}
        </View>

        {/* Record under review */}
        {targetLoading ? (
          <ListSkeleton count={3} />
        ) : (
          <ApprovalTargetCard
            objectLabel={objectLabel}
            meta={meta}
            fields={fields}
            record={target}
          />
        )}
      </ScrollView>

      {/* Decision bar */}
      {isPending ? (
        <View className="border-t border-border/40 px-4 py-3">
          <ApprovalActions
            req={req}
            onDecided={() =>
              router.canGoBack() ? router.back() : router.replace("/approvals")
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
