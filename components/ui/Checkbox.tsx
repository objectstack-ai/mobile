import React from "react";
import { Pressable } from "react-native";
import { Check } from "lucide-react-native";
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
  return (
    <Pressable
      role="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "h-5 w-5 items-center justify-center rounded border",
        checked
          ? "border-primary bg-primary"
          : "border-input bg-background",
        disabled && "opacity-50",
        className
      )}
    >
      {checked && <Check size={14} className="text-primary-foreground" />}
    </Pressable>
  );
}
