import React from "react";
import { View } from "react-native";
import { Skeleton } from "~/components/ui/Skeleton";

export interface ListSkeletonProps {
  /** How many placeholder rows to render. */
  count?: number;
}

/**
 * Placeholder rows that mirror the icon + title + subtitle card layout used by
 * the home, apps, and search lists. Showing the shape of incoming content reads
 * faster and calmer than a centred spinner.
 */
export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="flex-row items-center rounded-2xl border border-border bg-card p-5"
        >
          <Skeleton className="h-12 w-12 rounded-xl" />
          <View className="ml-4 flex-1 gap-2">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </View>
        </View>
      ))}
    </View>
  );
}
