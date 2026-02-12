import React from "react";
import { View } from "react-native";

export interface SkeletonDetailProps {
  sections?: number;
  fieldsPerSection?: number;
  testID?: string;
}

export function SkeletonDetail({
  sections = 3,
  fieldsPerSection = 4,
  testID = "skeleton-detail",
}: SkeletonDetailProps) {
  return (
    <View testID={testID} accessibilityLabel="Loading detail" accessibilityRole="progressbar">
      {/* Header skeleton */}
      <View className="px-4 py-5">
        <View className="h-6 w-2/3 rounded bg-muted animate-pulse mb-2" />
        <View className="h-4 w-1/3 rounded bg-muted animate-pulse" />
      </View>

      {/* Sections */}
      {Array.from({ length: sections }).map((_, s) => (
        <View key={s} testID={`${testID}-section-${s}`} className="px-4 py-4 border-t border-border/30">
          <View className="h-5 w-1/4 rounded bg-muted animate-pulse mb-3" />
          {Array.from({ length: fieldsPerSection }).map((_, f) => (
            <View key={f} className="mb-3">
              <View className="h-3 w-1/5 rounded bg-muted animate-pulse mb-1" />
              <View className="h-4 w-3/5 rounded bg-muted animate-pulse" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
