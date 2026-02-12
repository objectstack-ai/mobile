import React from "react";
import { View } from "react-native";

export interface SkeletonDashboardProps {
  cards?: number;
  testID?: string;
}

export function SkeletonDashboard({
  cards = 4,
  testID = "skeleton-dashboard",
}: SkeletonDashboardProps) {
  return (
    <View testID={testID} accessibilityLabel="Loading dashboard" accessibilityRole="progressbar">
      <View className="flex-row flex-wrap px-2 py-2">
        {Array.from({ length: cards }).map((_, i) => (
          <View key={i} testID={`${testID}-card-${i}`} className="w-1/2 p-2">
            <View className="rounded-xl bg-muted/30 p-4">
              <View className="h-5 w-1/2 rounded bg-muted animate-pulse mb-3" />
              <View className="h-8 w-3/4 rounded bg-muted animate-pulse mb-2" />
              <View className="h-3 w-full rounded bg-muted animate-pulse" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
