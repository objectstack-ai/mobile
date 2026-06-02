import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Inbox, ChevronRight } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { PressableCard } from "~/components/ui/PressableCard";
import { ApprovalActions } from "~/components/approvals/ApprovalActions";
import { formatDateTime } from "~/lib/formatting";
import { useApprovals, type ApprovalRequest } from "~/hooks/useApprovals";

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ApprovalCard({ req, onOpen }: { req: ApprovalRequest; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <PressableCard
        onPress={onOpen}
        className="flex-row items-start gap-2"
        accessibilityLabel={`${t("approvals.review")} ${req.process_name ?? req.id}`}
      >
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {req.process_name ?? t("approvals.title")}
          </Text>
          {req.object_name ? (
            <Text className="mt-0.5 text-xs text-muted-foreground">{humanize(req.object_name)}</Text>
          ) : null}
          {req.submitter_comment ? (
            <Text className="mt-2 text-sm text-foreground" numberOfLines={2}>
              {req.submitter_comment}
            </Text>
          ) : null}
          {req.created_at ? (
            <Text className="mt-2 text-xs text-muted-foreground">
              {formatDateTime(req.created_at)}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          {req.current_step ? <Badge variant="secondary">{req.current_step}</Badge> : null}
          <ChevronRight size={18} color="#94a3b8" />
        </View>
      </PressableCard>

      <View className="mt-3">
        <ApprovalActions req={req} />
      </View>
    </View>
  );
}

/**
 * Approvals inbox — the current user's pending requests. Each row links to a
 * review screen (the record under approval) and offers quick approve / reject.
 */
export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: requests, isLoading, error, refetch, isRefetching } = useApprovals();

  const count = requests?.length ?? 0;

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
              onOpen={() => router.push(`/approvals/${encodeURIComponent(req.id)}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
