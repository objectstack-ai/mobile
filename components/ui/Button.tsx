import React from "react";
import {
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

export interface ButtonProps extends PressableProps {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
  textClassName?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  variant = "default",
  size = "default",
  className,
  textClassName,
  children,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const handlePress = React.useCallback(
    (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [onPress]
  );

  return (
    <Pressable
      className={cn(
        "flex-row items-center justify-center",
        buttonVariants[variant],
        buttonSizes[size],
        disabled && "opacity-50",
        className
      )}
      disabled={disabled}
      onPress={handlePress}
      {...props}
    >
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
