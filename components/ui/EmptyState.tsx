import React from "react";
import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Button } from "~/components/ui/Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action rendered below the copy (e.g. a Retry button). */
  actionLabel?: string;
  onAction?: () => void;
  /** Spinner on the action button while an async retry runs. */
  actionLoading?: boolean;
  /** Tints the icon badge to signal an error rather than an empty result. */
  variant?: "default" | "error";
  className?: string;
}

/**
 * A centred icon-badge + title + body used for empty, error, and idle states
 * across the app. Keeps every "nothing here" screen visually consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isError = variant === "error";
  return (
    <View className={"flex-1 items-center justify-center px-10 " + (className ?? "")}>
      <View
        className={
          "h-20 w-20 items-center justify-center rounded-2xl " +
          (isError ? "bg-destructive/10" : "bg-muted")
        }
      >
        <Icon size={40} color={isError ? "#dc2626" : "#94a3b8"} />
      </View>
      <Text className="mt-5 text-lg font-semibold text-foreground">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          variant={isError ? "default" : "outline"}
          size="sm"
          className="mt-6"
          onPress={onAction}
          loading={actionLoading}
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
