import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { cn } from "~/lib/utils";
import type { ActionMeta } from "../renderers/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ActionBarProps {
  actions: ActionMeta[];
  onAction: (action: ActionMeta) => void;
  className?: string;
  /** Optional set of action names that should be hidden (e.g. due to permissions) */
  disabledActions?: Set<string>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ActionBar({ actions, onAction, className, disabledActions }: ActionBarProps) {
  const visibleActions = disabledActions
    ? actions.filter((a) => !disabledActions.has(a.name))
    : actions;
  if (visibleActions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn("border-b border-border bg-card", className)}
      contentContainerClassName="flex-row items-center gap-2 px-4 py-3"
    >
      {visibleActions.map((action) => {
        const variant = getButtonVariant(action);
        return (
          <Pressable
            key={action.name}
            className={cn(
              "flex-row items-center rounded-lg px-4 py-2",
              variant === "primary" && "bg-primary",
              variant === "destructive" && "bg-destructive",
              variant === "outline" && "border border-border",
            )}
            onPress={() => onAction(action)}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                variant === "primary" && "text-primary-foreground",
                variant === "destructive" && "text-destructive-foreground",
                variant === "outline" && "text-foreground",
              )}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getButtonVariant(
  action: ActionMeta,
): "primary" | "destructive" | "outline" {
  if (action.name.includes("delete") || action.name.includes("remove")) {
    return "destructive";
  }
  if (
    action.component === "action:button" ||
    action.type === "api" ||
    action.type === "flow"
  ) {
    return "primary";
  }
  return "outline";
}
