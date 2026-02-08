import React from "react";
import { View, Text } from "react-native";
import { cn } from "~/lib/utils";
import type { BatchProgress, BatchResult } from "~/hooks/useBatchOperations";

export interface BatchProgressIndicatorProps {
  /** Current progress (while processing) */
  progress: BatchProgress | null;
  /** Final result (after completion) */
  result: BatchResult | null;
  className?: string;
}

/**
 * Displays a progress bar and summary for batch operations.
 */
export function BatchProgressIndicator({
  progress,
  result,
  className,
}: BatchProgressIndicatorProps) {
  if (!progress && !result) return null;

  // If we have a final result, show the summary
  if (result && (!progress || progress.completed >= progress.total)) {
    return (
      <View className={cn("rounded-xl border border-border bg-card p-4", className)}>
        <Text className="text-sm font-medium text-foreground">
          Batch complete: {result.succeeded} succeeded, {result.failed} failed
          {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}
        </Text>
        {result.errors.length > 0 && (
          <View className="mt-2">
            {result.errors.slice(0, 5).map((err, i) => (
              <Text key={i} className="text-xs text-destructive">
                • {err.recordId ? `Record ${err.recordId}: ` : ""}{err.message}
              </Text>
            ))}
            {result.errors.length > 5 && (
              <Text className="mt-1 text-xs text-muted-foreground">
                …and {result.errors.length - 5} more errors
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  // In-progress state
  if (!progress) return null;
  const pct = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <View className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">
          Processing… {progress.completed}/{progress.total}
        </Text>
        {progress.failed > 0 && (
          <Text className="text-xs text-destructive">{progress.failed} failed</Text>
        )}
      </View>
      {/* Progress bar */}
      <View className="h-2 rounded-full bg-muted">
        <View
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </View>
    </View>
  );
}
