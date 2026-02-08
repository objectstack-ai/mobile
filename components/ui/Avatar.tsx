import React from "react";
import { View, Text, Image } from "react-native";
import { cn } from "~/lib/utils";

const avatarSizes = {
  sm: "h-8 w-8",
  default: "h-10 w-10",
  lg: "h-14 w-14",
} as const;

const avatarTextSizes = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-lg",
} as const;

export interface AvatarProps {
  src?: string;
  fallback: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}

export function Avatar({
  src,
  fallback,
  size = "default",
  className,
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <View
      className={cn(
        "items-center justify-center rounded-full bg-muted",
        avatarSizes[size],
        className
      )}
    >
      {src && !hasError ? (
        <Image
          source={{ uri: src }}
          className={cn("rounded-full", avatarSizes[size])}
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          className={cn(
            "font-semibold text-muted-foreground",
            avatarTextSizes[size]
          )}
        >
          {fallback}
        </Text>
      )}
    </View>
  );
}
