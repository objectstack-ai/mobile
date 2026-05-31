import React from "react";
import { Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";

export interface PressableCardProps extends PressableProps {
  className?: string;
  children: React.ReactNode;
  /** Fire a light haptic tap on press (native only; no-op on web). */
  haptic?: boolean;
}

/**
 * A card-styled Pressable with the tactile feedback users expect from a
 * top-tier app: a subtle scale-down + shadow/opacity change on press, plus an
 * optional light haptic. Use for any tappable card row (list items, dashboard
 * tiles) so press affordance is consistent everywhere.
 */
export function PressableCard({
  className,
  children,
  haptic = true,
  onPress,
  ...props
}: PressableCardProps) {
  const handlePress = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [haptic, onPress]
  );

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        "active:scale-[0.98] active:opacity-90",
        className
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
