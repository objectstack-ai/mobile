import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { cn } from "~/lib/utils";

export interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message, className }: LoadingScreenProps) {
  return (
    <View
      className={cn(
        "flex-1 items-center justify-center gap-3 bg-background",
        className
      )}
    >
      <ActivityIndicator size="large" />
      {message ? (
        <Text className="text-sm text-muted-foreground">{message}</Text>
      ) : null}
    </View>
  );
}
