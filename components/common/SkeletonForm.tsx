import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

export interface SkeletonFormProps {
  fields?: number;
  testID?: string;
}

export function SkeletonForm({
  fields = 5,
  testID = "skeleton-form",
}: SkeletonFormProps) {
  const { t } = useTranslation();
  return (
    <View testID={testID} accessibilityLabel={t("a11y.loadingForm")} accessibilityRole="progressbar">
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} testID={`${testID}-field-${i}`} className="px-4 py-3">
          {/* Label skeleton */}
          <View className="h-3 w-1/4 rounded bg-muted animate-pulse mb-2" />
          {/* Input skeleton */}
          <View className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        </View>
      ))}
    </View>
  );
}
