import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { cn } from "~/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps) {
  const thumbTranslate: ViewStyle = {
    transform: [{ translateX: checked ? 20 : 2 }],
  };

  return (
    <Pressable
      role="switch"
      accessibilityState={{ checked }}
      onPress={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "h-7 w-12 rounded-full justify-center",
        checked ? "bg-primary" : "bg-input",
        disabled && "opacity-50",
        className
      )}
    >
      <View
        className="h-5 w-5 rounded-full bg-background shadow-sm"
        style={thumbTranslate}
      />
    </Pressable>
  );
}
