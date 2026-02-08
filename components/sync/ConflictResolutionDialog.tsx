import React from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { AlertTriangle, RefreshCw, Trash2, X } from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { SyncQueueEntry } from "~/lib/sync-queue";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface ConflictResolutionDialogProps {
  visible: boolean;
  conflicts: SyncQueueEntry[];
  /** Accept the local version (retry push) */
  onKeepLocal: (entryId: number) => void;
  /** Discard the local mutation (accept server version) */
  onKeepServer: (entryId: number) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Modal dialog for resolving sync conflicts.
 * Shows each conflicting entry with options to keep local or server version.
 */
export function ConflictResolutionDialog({
  visible,
  conflicts,
  onKeepLocal,
  onKeepServer,
  onClose,
}: ConflictResolutionDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[70%] rounded-t-2xl bg-card px-4 pb-8 pt-5 shadow-lg">
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AlertTriangle size={20} color="#d97706" />
              <Text className="text-lg font-semibold text-foreground">
                Sync Conflicts ({conflicts.length})
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full p-1">
              <X size={20} color="#64748b" />
            </Pressable>
          </View>

          <Text className="mb-4 text-sm text-muted-foreground">
            These changes conflict with updates on the server. Choose which version to keep.
          </Text>

          <ScrollView className="flex-1">
            {conflicts.map((entry) => (
              <View
                key={entry.id}
                className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
              >
                <Text className="text-sm font-medium text-foreground">
                  {entry.operation.toUpperCase()} — {entry.objectName}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Record: {entry.recordId}
                </Text>
                {entry.errorMessage && (
                  <Text className="mt-1 text-xs text-destructive" numberOfLines={2}>
                    {entry.errorMessage}
                  </Text>
                )}

                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => onKeepLocal(entry.id)}
                    className="flex-1 flex-row items-center justify-center rounded-lg bg-primary/10 py-2"
                  >
                    <RefreshCw size={12} color="#1e40af" />
                    <Text className="ml-1.5 text-xs font-semibold text-primary">
                      Keep Local
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onKeepServer(entry.id)}
                    className="flex-1 flex-row items-center justify-center rounded-lg bg-destructive/10 py-2"
                  >
                    <Trash2 size={12} color="#ef4444" />
                    <Text className="ml-1.5 text-xs font-semibold text-destructive">
                      Keep Server
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
