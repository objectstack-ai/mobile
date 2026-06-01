import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Workflow, CheckCircle2, XCircle, MinusCircle } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { runStatusVariant } from "~/components/automation/FlowRunList";
import { useFlowRun, type FlowStepLog } from "~/hooks/useFlowRuns";
import { formatDateTime } from "~/lib/formatting";

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StepIcon({ status }: { status: FlowStepLog["status"] }) {
  if (status === "success") return <CheckCircle2 size={16} color="#16a34a" />;
  if (status === "failure") return <XCircle size={16} color="#dc2626" />;
  return <MinusCircle size={16} color="#94a3b8" />;
}

function StepRow({ step }: { step: FlowStepLog }) {
  return (
    <View className="flex-row gap-3 border-b border-border/40 px-4 py-3">
      <View className="pt-0.5">
        <StepIcon status={step.status} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">
          {step.nodeLabel ?? step.nodeId}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {humanize(step.nodeType)}
          {typeof step.durationMs === "number" ? ` · ${step.durationMs} ms` : ""}
        </Text>
        {step.error?.message ? (
          <Text className="mt-1 text-xs text-destructive">{step.error.message}</Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Flow run detail — shows one execution's status, timing, and per-node step log.
 */
export default function FlowRunDetailScreen() {
  const { name, runId } = useLocalSearchParams<{ name: string; runId: string }>();
  const flowName = Array.isArray(name) ? name[0] : name;
  const runIdStr = Array.isArray(runId) ? runId[0] : runId;
  const { t } = useTranslation();
  const { data: run, isLoading, error } = useFlowRun(flowName, runIdStr);

  const backFallback = `/flows/${encodeURIComponent(flowName ?? "")}`;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={t("workflow.runLabel")} backFallback={backFallback} />
        <ListSkeleton count={4} />
      </SafeAreaView>
    );
  }

  if (error || !run) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title={t("workflow.runLabel")} backFallback={backFallback} />
        <EmptyState
          icon={Workflow}
          variant={error ? "error" : "default"}
          title={error ? "Couldn't load run" : "Run not found"}
          description={error?.message}
        />
      </SafeAreaView>
    );
  }

  const steps = run.steps ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader title={run.flowName} subtitle={run.id} backFallback={backFallback} />

      {/* Run summary */}
      <View className="border-b border-border/40 px-4 py-3">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge variant={runStatusVariant(run.status)}>{humanize(run.status)}</Badge>
          {run.trigger?.type ? <Badge variant="outline">{humanize(run.trigger.type)}</Badge> : null}
          {typeof run.durationMs === "number" ? (
            <Badge variant="outline">{`${run.durationMs} ms`}</Badge>
          ) : null}
        </View>
        {run.startedAt ? (
          <Text className="mt-2 text-xs text-muted-foreground">
            {formatDateTime(run.startedAt)}
          </Text>
        ) : null}
        {run.error?.message ? (
          <Text className="mt-2 text-sm text-destructive">{run.error.message}</Text>
        ) : null}
      </View>

      {/* Step log */}
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <Text className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("workflow.steps")}
        </Text>
        {steps.length === 0 ? (
          <Text className="px-4 py-4 text-sm text-muted-foreground">—</Text>
        ) : (
          steps.map((step, i) => <StepRow key={`${step.nodeId}-${i}`} step={step} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
