import React from "react";
import { View, Text } from "react-native";
import { cn } from "~/lib/utils";

const badgeVariants = {
  default: "bg-primary",
  secondary: "bg-secondary",
  destructive: "bg-destructive",
  outline: "border border-border bg-transparent",
} as const;

const badgeTextVariants = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
} as const;

export interface BadgeProps {
  variant?: keyof typeof badgeVariants;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  className,
  children,
}: BadgeProps) {
  return (
    <View
      className={cn(
        "rounded-full px-2.5 py-0.5",
        badgeVariants[variant],
        className
      )}
    >
      {typeof children === "string" ? (
        <Text
          className={cn("text-xs font-semibold", badgeTextVariants[variant])}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
