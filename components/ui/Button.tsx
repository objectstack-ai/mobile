import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "~/lib/utils";

const buttonVariants = {
  default: "bg-primary active:opacity-90",
  destructive: "bg-destructive active:opacity-90",
  outline: "border border-border bg-background active:bg-accent",
  ghost: "active:bg-accent",
} as const;

const buttonTextVariants = {
  default: "text-primary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
} as const;

const buttonSizes = {
  default: "h-12 px-5 rounded-xl",
  sm: "h-9 px-3 rounded-lg",
  lg: "h-14 px-8 rounded-xl",
} as const;

const buttonTextSizes = {
  default: "text-base",
  sm: "text-sm",
  lg: "text-lg",
} as const;

const spinnerColor: Record<keyof typeof buttonVariants, string> = {
  default: "#f8fafc",
  destructive: "#f8fafc",
  outline: "#64748b",
  ghost: "#64748b",
};

export interface ButtonProps extends PressableProps {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Shows a spinner, keeps the button sized, and blocks presses while true. */
  loading?: boolean;
}

export function Button({
  variant = "default",
  size = "default",
  className,
  textClassName,
  children,
  disabled,
  loading = false,
  onPress,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [onPress]
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={cn(
        "flex-row items-center justify-center gap-2 active:scale-[0.98]",
        buttonVariants[variant],
        buttonSizes[size],
        isDisabled && "opacity-50",
        className
      )}
      disabled={isDisabled}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor[variant]} />
      ) : null}
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-semibold",
            buttonTextVariants[variant],
            buttonTextSizes[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
