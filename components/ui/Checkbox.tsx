import React from "react";
import { Pressable } from "react-native";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
}: CheckboxProps) {
  const handlePress = () => {
    void Haptics.selectionAsync();
    onCheckedChange(!checked);
  };

  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      className={cn(
        "h-5 w-5 items-center justify-center rounded border",
        checked
          ? "border-primary bg-primary"
          : "border-input bg-background",
        disabled ? "opacity-50" : "active:opacity-70",
        className
      )}
    >
      {checked && <Check size={14} color="#ffffff" />}
    </Pressable>
  );
}
