import React from "react";
import { View, Text } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { PressableCard } from "~/components/ui/PressableCard";
import { Badge } from "~/components/ui/Badge";
import { formatDateTime } from "~/lib/formatting";
import type { FlowRun } from "~/hooks/useFlowRuns";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Map an execution status to a badge variant. */
export function runStatusVariant(status: string | undefined): BadgeVariant {
  switch ((status ?? "").toLowerCase()) {
    case "success":
    case "completed":
      return "default";
    case "failure":
    case "failed":
    case "error":
      return "destructive";
    case "running":
    case "pending":
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

function humanize(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface FlowRunListProps {
  runs: FlowRun[];
  onPressRun?: (run: FlowRun) => void;
}

/** A tappable list of flow executions (status, trigger, time). */
export function FlowRunList({ runs, onPressRun }: FlowRunListProps) {
  return (
    <View className="gap-2">
      {runs.map((run) => (
        <PressableCard
          key={run.id}
          onPress={() => onPressRun?.(run)}
          className="flex-row items-center rounded-xl border border-border bg-card px-4 py-3"
          accessibilityLabel={`Run ${run.id}, status ${run.status}`}
        >
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Badge variant={runStatusVariant(run.status)}>{humanize(run.status)}</Badge>
              {run.trigger?.type ? (
                <Text className="text-xs text-muted-foreground">{humanize(run.trigger.type)}</Text>
              ) : null}
            </View>
            {run.startedAt ? (
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(run.startedAt)}
                {typeof run.durationMs === "number" ? ` · ${run.durationMs} ms` : ""}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </PressableCard>
      ))}
    </View>
  );
}
