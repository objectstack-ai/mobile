import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Workflow, Play } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useToast } from "~/components/ui/Toast";
import { useConfirm } from "~/components/ui/ConfirmDialog";
import { FlowViewer } from "~/components/automation/FlowViewer";
import { FlowRunList } from "~/components/automation/FlowRunList";
import { useFlow } from "~/hooks/useFlows";
import { useFlowRuns, useTriggerFlow } from "~/hooks/useFlowRuns";

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Flow detail — a read-only `FlowViewer` diagram of one automation flow, plus a
 * "Run" action (manual trigger) and the recent run history.
 */
export default function FlowDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const flowName = Array.isArray(name) ? name[0] : name;
  const router = useRouter();
  const { t } = useTranslation();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const { flow, isLoading, error } = useFlow(flowName);
  const { data: runsData, isLoading: runsLoading } = useFlowRuns(flowName);
  const { trigger, isTriggering } = useTriggerFlow();

  const runs = runsData?.runs ?? [];

  const handleRun = async () => {
    if (!flow) return;
    const ok = await confirm({
      title: t("workflow.runFlow"),
      message: t("workflow.runConfirm", { flow: flow.label }),
      confirmLabel: t("workflow.runLabel"),
    });
    if (!ok) return;
    const result = await trigger(flow.name);
    if (result.ok) {
      toastSuccess(t("workflow.runStarted"));
    } else {
      toastError(result.error ?? t("workflow.runFailed"));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title="Flow" backFallback="/flows" />
        <ListSkeleton count={5} />
      </SafeAreaView>
    );
  }

  if (error || !flow) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
        <ScreenHeader title="Flow" backFallback="/flows" />
        <EmptyState
          icon={Workflow}
          variant={error ? "error" : "default"}
          title={error ? "Couldn't load flow" : "Flow not found"}
          description={error ? error.message : `No flow named "${flowName}".`}
        />
      </SafeAreaView>
    );
  }

  const inputs = flow.variables.filter((v) => v.isInput);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <ScreenHeader
        title={flow.label}
        subtitle={flow.name}
        backFallback="/flows"
        right={
          <Pressable
            onPress={handleRun}
            disabled={isTriggering}
            accessibilityRole="button"
            accessibilityLabel={t("workflow.runFlow")}
            className={`flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 ${
              isTriggering ? "opacity-60" : "active:opacity-80"
            }`}
          >
            {isTriggering ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Play size={14} color="#ffffff" />
            )}
            <Text className="text-sm font-medium text-primary-foreground">
              {t("workflow.runLabel")}
            </Text>
          </Pressable>
        }
      />

      {/* Metadata summary */}
      <View className="border-b border-border/40 px-4 py-3">
        {flow.description ? (
          <Text className="mb-2 text-sm text-muted-foreground">{flow.description}</Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          {flow.type ? <Badge variant="secondary">{humanize(flow.type)}</Badge> : null}
          <Badge variant={flow.status === "active" || flow.active ? "default" : "outline"}>
            {flow.status ? humanize(flow.status) : flow.active ? "Active" : "Inactive"}
          </Badge>
          {typeof flow.version === "number" ? (
            <Badge variant="outline">{`v${flow.version}`}</Badge>
          ) : null}
          {inputs.length > 0 ? (
            <Badge variant="outline">{`${inputs.length} input${inputs.length === 1 ? "" : "s"}`}</Badge>
          ) : null}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Flow diagram */}
        <FlowViewer nodes={flow.nodes} edges={flow.edges} />

        {/* Run history */}
        <View className="mt-2 px-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("workflow.runHistory")}
          </Text>
          {runsLoading ? (
            <ListSkeleton count={3} />
          ) : runs.length === 0 ? (
            <Text className="py-4 text-sm text-muted-foreground">{t("workflow.noRuns")}</Text>
          ) : (
            <FlowRunList
              runs={runs}
              onPressRun={(run) =>
                router.push(
                  `/flows/${encodeURIComponent(flow.name)}/runs/${encodeURIComponent(run.id)}`,
                )
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
