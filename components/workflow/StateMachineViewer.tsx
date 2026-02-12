import React from "react";
import { View, Text, ScrollView } from "react-native";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface StateMachineViewerProps {
  /** States in the machine */
  states: Array<{
    name: string;
    type: "initial" | "normal" | "final";
    label?: string;
  }>;
  /** Transitions between states */
  transitions: Array<{
    from: string;
    to: string;
    event: string;
    label?: string;
  }>;
  /** Name of the currently active state */
  currentState?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatStateName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTransitionsFrom(
  stateName: string,
  transitions: StateMachineViewerProps["transitions"],
): StateMachineViewerProps["transitions"] {
  return transitions.filter((t) => t.from === stateName);
}

/* ------------------------------------------------------------------ */
/*  State Badge                                                        */
/* ------------------------------------------------------------------ */

function StateBadge({
  name,
  type,
  label,
  isCurrent,
}: {
  name: string;
  type: "initial" | "normal" | "final";
  label?: string;
  isCurrent: boolean;
}) {
  const bgClass = isCurrent
    ? "bg-primary/20 border-primary"
    : "bg-card border-border";
  const textClass = isCurrent ? "text-primary" : "text-foreground";
  const typeIndicator =
    type === "initial" ? "●" : type === "final" ? "◎" : "";

  return (
    <View className={`rounded-full border px-3 py-1.5 ${bgClass}`}>
      <Text className={`text-sm font-semibold ${textClass}`}>
        {typeIndicator ? `${typeIndicator} ` : ""}
        {label ?? formatStateName(name)}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Diagram showing states as badges and transitions as labeled
 * arrows between them.
 */
export function StateMachineViewer({
  states,
  transitions,
  currentState,
}: StateMachineViewerProps) {
  if (states.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-sm text-muted-foreground">
          No states defined
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <View className="gap-3 px-4 py-3">
        {states.map((state) => {
          const outgoing = getTransitionsFrom(state.name, transitions);

          return (
            <View key={state.name} className="items-center gap-1.5">
              {/* State badge */}
              <StateBadge
                name={state.name}
                type={state.type}
                label={state.label}
                isCurrent={state.name === currentState}
              />

              {/* Transitions from this state */}
              {outgoing.map((t, idx) => (
                <View
                  key={`${t.from}-${t.to}-${idx}`}
                  className="items-center gap-0.5"
                >
                  <View className="h-3 w-px bg-muted-foreground/30" />
                  <Text className="text-[10px] text-muted-foreground">
                    {t.label ?? t.event}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    ↓ {formatStateName(t.to)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
