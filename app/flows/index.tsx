import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Workflow } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { PressableCard } from "~/components/ui/PressableCard";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useFlows, type FlowDefinition } from "~/hooks/useFlows";

/** Title-case a flow trigger type / status token (`record_change` → "Record Change"). */
function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FlowCard({ flow, onPress }: { flow: FlowDefinition; onPress: () => void }) {
  const stepCount = flow.nodes.length;
  return (
    <PressableCard
      onPress={onPress}
      className="mb-3 rounded-xl border border-border bg-card p-4"
      accessibilityLabel={`Open flow ${flow.label}`}
    >
      <Text className="text-base font-semibold text-foreground">{flow.label}</Text>
      {flow.description ? (
        <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={2}>
          {flow.description}
        </Text>
      ) : null}
      <View className="mt-2 flex-row flex-wrap gap-2">
        {flow.type ? <Badge variant="secondary">{humanize(flow.type)}</Badge> : null}
        <Badge variant={flow.status === "active" || flow.active ? "default" : "outline"}>
          {flow.status ? humanize(flow.status) : flow.active ? "Active" : "Inactive"}
        </Badge>
        <Badge variant="outline">{`${stepCount} step${stepCount === 1 ? "" : "s"}`}</Badge>
      </View>
    </PressableCard>
  );
}

/**
 * Automation Flows — lists every flow the connected server exposes and links to
 * a read-only diagram of each. Surfaces the `FlowViewer` that previously had no
 * route into the app.
 */
export default function FlowsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: flows, isLoading, error, refetch, isRefetching } = useFlows();

  const count = flows?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title={t("empty.flowsHeader")}
        subtitle={count > 0 ? t("empty.flowCount", { count }) : undefined}
      />
      {isLoading ? (
        <ListSkeleton count={6} />
      ) : error ? (
        <EmptyState
          icon={Workflow}
          variant="error"
          title={t("empty.loadFlows")}
          description={error.message}
          actionLabel={t("common.retry")}
          onAction={() => void refetch()}
          actionLoading={isRefetching}
        />
      ) : count === 0 ? (
        <EmptyState
          icon={Workflow}
          title={t("empty.flowsTitle")}
          description={t("empty.flowsDesc")}
        />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 pt-4 pb-8">
          {flows!.map((flow) => (
            <FlowCard
              key={flow.name}
              flow={flow}
              onPress={() => router.push(`/flows/${encodeURIComponent(flow.name)}`)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
