import React from "react";
import { View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
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
 * across the app. The badge sits inside a soft concentric halo for depth, and
 * the whole group eases in — the badge springs, the copy rises with a short
 * stagger — so "nothing here" feels considered rather than blank. Keeps every
 * empty/error screen visually consistent.
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
    // Plain View owns the flex-1 centering; only the inner pieces animate, so
    // the entrance can never interfere with layout.
    <View
      className={"flex-1 items-center justify-center px-10 " + (className ?? "")}
    >
      {/* Layered badge: a faint outer halo behind a solid inner tile gives the
          icon depth instead of floating on a flat square. */}
      <Animated.View
        entering={ZoomIn.springify().damping(14).stiffness(160)}
        className="h-24 w-24 items-center justify-center"
      >
        <View
          className={
            "absolute h-24 w-24 rounded-3xl " +
            (isError ? "bg-destructive/5" : "bg-primary/5")
          }
        />
        <View
          className={
            "h-[68px] w-[68px] items-center justify-center rounded-2xl " +
            (isError ? "bg-destructive/10" : "bg-primary/10")
          }
        >
          <Icon size={36} color={isError ? "#dc2626" : "#64748b"} />
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(90).duration(340)}
        className="mt-5 text-lg font-semibold text-foreground"
      >
        {title}
      </Animated.Text>

      {description ? (
        <Animated.Text
          entering={FadeInDown.delay(150).duration(340)}
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          {description}
        </Animated.Text>
      ) : null}

      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(210).duration(340)}>
          <Button
            variant={isError ? "default" : "outline"}
            size="sm"
            className="mt-6"
            onPress={onAction}
            loading={actionLoading}
          >
            {actionLabel}
          </Button>
        </Animated.View>
      ) : null}
    </View>
  );
}
