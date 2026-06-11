import React from "react";
import { Text, type TextProps } from "react-native";
import { useCountUp } from "~/hooks/useCountUp";

export interface AnimatedNumberProps extends TextProps {
  /** The target numeric value to count up/down to. */
  value: number;
  /** Format the (animating, fractional) value into the display string. */
  format: (n: number) => string;
  /** Count-up duration in ms. */
  durationMs?: number;
  className?: string;
}

/**
 * A `<Text>` whose numeric value animates (counts up) to `value` and formats
 * each interpolated frame via `format`. Used for dashboard KPI headlines.
 */
export function AnimatedNumber({
  value,
  format,
  durationMs,
  className,
  ...rest
}: AnimatedNumberProps) {
  const animated = useCountUp(value, durationMs);
  return (
    <Text className={className} {...rest}>
      {format(animated)}
    </Text>
  );
}
