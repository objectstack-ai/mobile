import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "~/lib/theme-colors";
import { StateMachineViewer } from "./StateMachineViewer";
import type { RecordStateMachine, SMTransition } from "~/hooks/useStateMachines";

export interface RecordStateMachinesProps {
  machines: RecordStateMachine[];
  /**
   * Advance the record's state. Called with the machine and the chosen
   * outgoing transition. When omitted, the diagram is purely read-only.
   */
  onTransition?: (machine: RecordStateMachine, transition: SMTransition) => void;
  /** `"<machineKey>:<event>"` currently being applied — drives the spinner. */
  pendingEvent?: string | null;
}

function stateLabel(machine: RecordStateMachine, name: string): string {
  return machine.states.find((s) => s.name === name)?.label ?? name;
}

/**
 * Renders a record's state machines as titled cards: the `StateMachineViewer`
 * lifecycle diagram with the current state highlighted, plus — when
 * `onTransition` is provided and the record isn't in a final state — a row of
 * buttons to advance to each reachable next state.
 */
export function RecordStateMachines({
  machines,
  onTransition,
  pendingEvent,
}: RecordStateMachinesProps) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  if (machines.length === 0) return null;

  return (
    <View>
      {machines.map((m) => {
        const available: SMTransition[] =
          onTransition && m.currentState
            ? m.transitions.filter((tr) => tr.from === m.currentState)
            : [];

        return (
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

            {available.length > 0 && (
              <View className="border-t border-border px-4 py-3">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("workflow.availableActions")}
                </Text>
                <View className="gap-2">
                  {available.map((tr) => {
                    const isBusy = pendingEvent === `${m.key}:${tr.event}`;
                    const anyBusy = !!pendingEvent;
                    return (
                      <Pressable
                        key={tr.event}
                        onPress={() => onTransition?.(m, tr)}
                        disabled={anyBusy}
                        accessibilityRole="button"
                        accessibilityLabel={`${tr.label ?? tr.event} → ${stateLabel(m, tr.to)}`}
                        className={`flex-row items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 active:bg-primary/10 ${
                          anyBusy ? "opacity-50" : ""
                        }`}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-medium text-foreground">
                            {tr.label ?? tr.event}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            → {stateLabel(m, tr.to)}
                          </Text>
                        </View>
                        {isBusy ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <ArrowRight size={16} color={accent} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
