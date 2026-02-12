import React from "react";
import { View, Text, Pressable } from "react-native";
import type { AgentTask } from "~/hooks/useAgent";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AgentProgressProps {
  /** The agent task to display progress for */
  task: AgentTask | null;
  /** Callback to cancel a running task */
  onCancel?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  pending: "#eab308",
  running: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
  cancelled: "#94a3b8",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: AgentTask["status"] }) {
  return (
    <View
      className="rounded-full px-2.5 py-0.5"
      style={{ backgroundColor: `${statusColors[status] ?? "#94a3b8"}20` }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: statusColors[status] ?? "#94a3b8" }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Displays progress of an AI agent task including status badge,
 * progress bar, agent ID, and timestamps.
 */
export function AgentProgress({ task, onCancel }: AgentProgressProps) {
  if (!task) return null;

  const isRunning = task.status === "running" || task.status === "pending";
  const progressPercent = Math.min(Math.max(task.progress, 0), 100);

  return (
    <View className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-sm font-semibold text-foreground">
          Agent: {task.agentId}
        </Text>
        <StatusBadge status={task.status} />
      </View>

      {/* Progress bar */}
      <View className="px-4 pb-2">
        <View className="h-2 rounded-full bg-muted">
          <View
            className="h-2 rounded-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
        <Text className="mt-1 text-xs text-muted-foreground">
          {progressPercent}% complete
        </Text>
      </View>

      {/* Timestamps */}
      <View className="flex-row items-center gap-3 px-4 pb-3">
        <Text className="text-xs text-muted-foreground">
          Started: {formatTimestamp(task.createdAt)}
        </Text>
      </View>

      {/* Error message */}
      {task.error && (
        <View className="border-t border-border px-4 py-2">
          <Text className="text-xs text-destructive">{task.error}</Text>
        </View>
      )}

      {/* Cancel button */}
      {isRunning && onCancel && (
        <View className="border-t border-border px-4 py-2">
          <Pressable
            className="items-center rounded-lg bg-destructive px-3 py-2 active:bg-destructive/80"
            onPress={onCancel}
          >
            <Text className="text-sm font-semibold text-white">Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
