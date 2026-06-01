import React from "react";
import { View, Text } from "react-native";
import { StateMachineViewer } from "./StateMachineViewer";
import type { RecordStateMachine } from "~/hooks/useStateMachines";

export interface RecordStateMachinesProps {
  machines: RecordStateMachine[];
}

/**
 * Renders a record's state machines as titled cards, each showing the
 * `StateMachineViewer` lifecycle diagram with the record's current state
 * highlighted. Designed to sit inside the record detail's scroll view, so the
 * viewer is rendered non-scrollable.
 */
export function RecordStateMachines({ machines }: RecordStateMachinesProps) {
  if (machines.length === 0) return null;

  return (
    <View>
      {machines.map((m) => (
        <View
          key={m.key}
          className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
        >
          <View className="border-b border-border px-4 py-3">
            <Text className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {m.title}
            </Text>
          </View>
          <StateMachineViewer
            states={m.states}
            transitions={m.transitions}
            currentState={m.currentState}
            scrollable={false}
          />
        </View>
      ))}
    </View>
  );
}
