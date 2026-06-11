import React from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A snappy-but-soft spring: settles quickly without overshooting enough to
// feel bouncy. Shared by every card so press feedback is identical everywhere.
const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.5 } as const;

export interface PressableCardProps extends PressableProps {
  className?: string;
  children: React.ReactNode;
  /** Fire a light haptic tap on press (native only; no-op on web). */
  haptic?: boolean;
}

/**
 * A card-styled Pressable with the tactile feedback users expect from a
 * top-tier app: a spring-driven scale-down on press (not an instant snap),
 * a subtle dim, plus an optional light haptic. Use for any tappable card row
 * (list items, dashboard tiles) so press affordance is consistent everywhere.
 */
export function PressableCard({
  className,
  children,
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: PressableCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [haptic, onPress]
  );

  const handlePressIn = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
      scale.value = withSpring(0.97, PRESS_SPRING);
      onPressIn?.(e);
    },
    [scale, onPressIn]
  );

  const handlePressOut = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
      scale.value = withSpring(1, PRESS_SPRING);
      onPressOut?.(e);
    },
    [scale, onPressOut]
  );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        "active:opacity-90",
        className
      )}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
