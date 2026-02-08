import React from "react";
import { View, Text, Pressable } from "react-native";
import { WifiOff, RefreshCw } from "lucide-react-native";
import { cn } from "~/lib/utils";

export interface OfflineIndicatorProps {
  isOffline: boolean;
  pendingCount?: number;
  isSyncing?: boolean;
  onSyncPress?: () => void;
  className?: string;
}

/**
 * Banner that appears when the device is offline.
 * Shows pending mutation count and a manual sync button.
 */
export function OfflineIndicator({
  isOffline,
  pendingCount = 0,
  isSyncing = false,
  onSyncPress,
  className,
}: OfflineIndicatorProps) {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <View
      className={cn(
        "flex-row items-center justify-between px-4 py-2",
        isOffline ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-50 dark:bg-blue-900/20",
        className,
      )}
    >
      <View className="flex-row items-center gap-2">
        {isOffline && <WifiOff size={14} color="#d97706" />}
        <Text className="text-xs font-medium text-foreground">
          {isOffline
            ? "You are offline"
            : `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`}
        </Text>
        {pendingCount > 0 && isOffline && (
          <Text className="text-xs text-muted-foreground">
            • {pendingCount} pending
          </Text>
        )}
      </View>

      {!isOffline && pendingCount > 0 && onSyncPress && (
        <Pressable
          onPress={onSyncPress}
          disabled={isSyncing}
          className="flex-row items-center rounded-lg bg-primary/10 px-2.5 py-1"
        >
          <RefreshCw size={12} color="#1e40af" />
          <Text className="ml-1 text-xs font-medium text-primary">
            {isSyncing ? "Syncing…" : "Sync"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
