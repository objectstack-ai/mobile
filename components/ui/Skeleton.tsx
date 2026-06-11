import React from "react";
import { type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "~/lib/utils";

export interface SkeletonProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * A pulsing placeholder block. The pulse runs entirely on the reanimated UI
 * thread (a looped opacity 1 → 0.4 → 1), so a list of a dozen skeletons costs
 * zero React re-renders while it breathes — previously each frame called
 * setState on every skeleton.
 */
export function Skeleton({ className, width, height }: SkeletonProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const dims: ViewStyle = {
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
  };

  return (
    <Animated.View
      className={cn("rounded-lg bg-muted", className)}
      style={[animatedStyle, dims]}
    />
  );
}
