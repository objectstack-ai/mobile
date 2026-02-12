import React from "react";
import { View } from "react-native";

export interface SkeletonListProps {
  rows?: number;
  showAvatar?: boolean;
  testID?: string;
}

export function SkeletonList({ rows = 5, showAvatar = true, testID = "skeleton-list" }: SkeletonListProps) {
  return (
    <View testID={testID} accessibilityLabel="Loading list" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="flex-row items-center px-4 py-3 border-b border-border/30">
          {showAvatar && (
            <View className="h-10 w-10 rounded-full bg-muted animate-pulse mr-3" />
          )}
          <View className="flex-1">
            <View className="h-4 w-3/4 rounded bg-muted animate-pulse mb-2" />
            <View className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );
}
