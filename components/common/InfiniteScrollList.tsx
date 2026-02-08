import React from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  type ListRenderItem,
} from "react-native";
import { cn } from "~/lib/utils";

export interface InfiniteScrollListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  onEndReached: () => void;
  isLoading: boolean;
  hasMore: boolean;
  ListEmptyComponent?: React.ReactElement;
  className?: string;
  keyExtractor?: (item: T, index: number) => string;
}

export function InfiniteScrollList<T>({
  data,
  renderItem,
  onEndReached,
  isLoading,
  hasMore,
  ListEmptyComponent,
  className,
  keyExtractor,
}: InfiniteScrollListProps<T>) {
  const handleEndReached = React.useCallback(() => {
    if (!isLoading && hasMore) {
      onEndReached();
    }
  }, [isLoading, hasMore, onEndReached]);

  return (
    <FlatList
      className={cn("flex-1", className)}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isLoading ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}
