import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, TextInput } from "react-native";
import {
  ArrowRight,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { cn } from "~/lib/utils";
import type {
  WorkflowState,
  WorkflowTransition,
  WorkflowHistoryEntry,
} from "~/hooks/useWorkflowState";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface WorkflowStatePanelProps {
  /** Current workflow state */
  state: WorkflowState | null;
  /** Loading */
  isLoading?: boolean;
  /** Transition handler */
  onTransition?: (transitionName: string, comment?: string) => Promise<void>;
  /** Approve handler */
  onApprove?: (comment?: string) => Promise<void>;
  /** Reject handler */
  onReject?: (comment?: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  State Badge                                                        */
/* ------------------------------------------------------------------ */

function StateBadge({ state }: { state: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
      <Clock size={12} color="#3b82f6" />
      <Text className="text-xs font-semibold text-primary">
        {state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Transition Button                                                  */
/* ------------------------------------------------------------------ */

function TransitionButton({
  transition,
  onPress,
}: {
  transition: WorkflowTransition;
  onPress: (t: WorkflowTransition) => void;
}) {
  return (
    <Pressable
      className="flex-row items-center gap-1.5 rounded-lg border border-border px-3 py-2 active:bg-muted/50"
      onPress={() => onPress(transition)}
    >
      <ArrowRight size={14} color="#64748b" />
      <Text className="text-sm font-medium text-foreground">
        {transition.label ?? transition.name.replace(/_/g, " ")}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  History Entry                                                      */
/* ------------------------------------------------------------------ */

function HistoryRow({ entry }: { entry: WorkflowHistoryEntry }) {
  return (
    <View className="flex-row items-start gap-2 py-2">
      <View className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/40" />
      <View className="flex-1">
        <Text className="text-xs text-foreground">
          <Text className="font-semibold">{entry.fromState}</Text>
          {" → "}
          <Text className="font-semibold">{entry.toState}</Text>
        </Text>
        <Text className="text-xs text-muted-foreground">
          {entry.action} by {entry.userId} ·{" "}
          {new Date(entry.timestamp).toLocaleDateString()}
        </Text>
        {entry.comment && (
          <Text className="mt-0.5 text-xs italic text-muted-foreground">
            "{entry.comment}"
          </Text>
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function WorkflowStatePanel({
  state,
  isLoading = false,
  onTransition,
  onApprove,
  onReject,
}: WorkflowStatePanelProps) {
  const [isActing, setIsActing] = useState(false);
  const [comment, setComment] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color="#1e40af" />
      </View>
    );
  }

  if (!state) return null;

  const hasApproval = state.availableTransitions.some(
    (t) => t.requiresApproval,
  );

  const handleTransition = async (t: WorkflowTransition) => {
    if (!onTransition) return;
    setIsActing(true);
    try {
      await onTransition(t.name, comment || undefined);
      setComment("");
    } finally {
      setIsActing(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsActing(true);
    try {
      await onApprove(comment || undefined);
      setComment("");
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsActing(true);
    try {
      await onReject(comment || undefined);
      setComment("");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <View className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header: state badge */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow
        </Text>
        <StateBadge state={state.currentState} />
      </View>

      {/* Transitions */}
      {state.availableTransitions.length > 0 && (
        <View className="gap-2 px-4 pt-3">
          {/* Comment input */}
          <TextInput
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Add a comment (optional)"
            placeholderTextColor="#94a3b8"
            value={comment}
            onChangeText={setComment}
          />

          {/* Regular transitions */}
          <View className="flex-row flex-wrap gap-2">
            {state.availableTransitions
              .filter((t) => !t.requiresApproval)
              .map((t) => (
                <TransitionButton
                  key={t.name}
                  transition={t}
                  onPress={handleTransition}
                />
              ))}
          </View>

          {/* Approve / Reject */}
          {hasApproval && (
            <View className="flex-row gap-2">
              {onApprove && (
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2"
                  onPress={handleApprove}
                  disabled={isActing}
                >
                  <Check size={14} color="#fff" />
                  <Text className="text-sm font-semibold text-white">
                    Approve
                  </Text>
                </Pressable>
              )}
              {onReject && (
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-2"
                  onPress={handleReject}
                  disabled={isActing}
                >
                  <X size={14} color="#fff" />
                  <Text className="text-sm font-semibold text-white">
                    Reject
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {isActing && (
            <ActivityIndicator size="small" color="#1e40af" />
          )}
        </View>
      )}

      {/* History toggle */}
      {state.history && state.history.length > 0 && (
        <View className="px-4 pb-3 pt-2">
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text className="text-xs font-medium text-primary">History</Text>
            {showHistory ? (
              <ChevronUp size={12} color="#3b82f6" />
            ) : (
              <ChevronDown size={12} color="#3b82f6" />
            )}
          </Pressable>
          {showHistory && (
            <View className="mt-2">
              {state.history.map((entry, idx) => (
                <HistoryRow key={`${entry.timestamp}-${idx}`} entry={entry} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Bottom padding when no history */}
      {(!state.history || state.history.length === 0) &&
        state.availableTransitions.length > 0 && (
          <View className="h-3" />
        )}
    </View>
  );
}
