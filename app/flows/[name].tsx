import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Workflow } from "lucide-react-native";
import { ScreenHeader } from "~/components/common/ScreenHeader";
import { Badge } from "~/components/ui/Badge";
import { EmptyState } from "~/components/ui/EmptyState";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { FlowViewer } from "~/components/automation/FlowViewer";
import { useFlow } from "~/hooks/useFlows";

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Flow detail — renders a read-only `FlowViewer` diagram of a single automation
 * flow's nodes and edges, plus its trigger/status metadata.
 */
export default function FlowDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const flowName = Array.isArray(name) ? name[0] : name;
  const { flow, isLoading, error } = useFlow(flowName);

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
      <ScreenHeader title={flow.label} subtitle={flow.name} backFallback="/flows" />

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

      {/* Flow diagram */}
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <FlowViewer nodes={flow.nodes} edges={flow.edges} />
      </ScrollView>
    </SafeAreaView>
  );
}
