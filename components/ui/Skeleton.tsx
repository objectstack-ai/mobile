import React from "react";
import { View, type ViewStyle } from "react-native";
import { cn } from "~/lib/utils";

export interface SkeletonProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    let frame: number;
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      // Pulse between 0.4 and 1.0 over 1.5s
      const t = (Math.sin((elapsed / 1500) * Math.PI * 2) + 1) / 2;
      setOpacity(0.4 + t * 0.6);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const style: ViewStyle = {
    opacity,
    ...(width != null ? { width } : {}),
    ...(height != null ? { height } : {}),
  };

  return (
    <View
      className={cn("rounded-lg bg-muted", className)}
      style={style}
    />
  );
}
