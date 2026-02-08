import React from "react";
import { View, Text, Pressable } from "react-native";
import { Trash2, Edit3, X } from "lucide-react-native";
import { cn } from "~/lib/utils";

export interface BatchActionBarProps {
  /** Number of selected records */
  selectedCount: number;
  /** Called when user taps batch-delete */
  onBatchDelete?: () => void;
  /** Called when user taps batch-edit (optional) */
  onBatchEdit?: () => void;
  /** Clear selection */
  onClearSelection: () => void;
  className?: string;
}

/**
 * Action bar shown at the bottom when records are multi-selected.
 */
export function BatchActionBar({
  selectedCount,
  onBatchDelete,
  onBatchEdit,
  onClearSelection,
  className,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View
      className={cn(
        "flex-row items-center justify-between border-t border-border bg-card px-4 py-3",
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        <Pressable onPress={onClearSelection} className="rounded-full bg-muted p-1.5">
          <X size={14} color="#64748b" />
        </Pressable>
        <Text className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        {onBatchEdit && (
          <Pressable
            onPress={onBatchEdit}
            className="flex-row items-center rounded-lg bg-primary/10 px-3 py-2"
          >
            <Edit3 size={14} color="#1e40af" />
            <Text className="ml-1.5 text-xs font-semibold text-primary">Edit</Text>
          </Pressable>
        )}
        {onBatchDelete && (
          <Pressable
            onPress={onBatchDelete}
            className="flex-row items-center rounded-lg bg-destructive/10 px-3 py-2"
          >
            <Trash2 size={14} color="#ef4444" />
            <Text className="ml-1.5 text-xs font-semibold text-destructive">Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
