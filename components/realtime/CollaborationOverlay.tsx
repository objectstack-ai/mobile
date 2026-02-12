import React from "react";
import { View, Text } from "react-native";
import type { CollaborationParticipant } from "~/hooks/useCollaboration";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CollaborationOverlayProps {
  /** List of collaboration participants */
  participants: CollaborationParticipant[];
  /** Whether to render cursor indicators */
  showCursors?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitial(participant: CollaborationParticipant): string {
  if (participant.name) return participant.name.charAt(0).toUpperCase();
  return participant.userId.charAt(0).toUpperCase();
}

function getFieldLabel(participant: CollaborationParticipant): string | null {
  if (!participant.cursor?.field) return null;
  return `${participant.name ?? participant.userId} editing this field`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Displays participant cursors and presence indicators on a
 * collaborative editing screen.
 */
export function CollaborationOverlay({
  participants,
  showCursors = true,
}: CollaborationOverlayProps) {
  if (participants.length === 0) return null;

  return (
    <View className="absolute inset-0" pointerEvents="none" accessible={true} accessibilityLabel={`${participants.length} collaborator${participants.length !== 1 ? "s" : ""} active`}>
      {participants.map((participant) => (
        <View key={participant.userId}>
          {/* Cursor dot */}
          {showCursors && participant.cursor && (
            <View
              className="absolute items-center"
              style={{
                left: participant.cursor.x,
                top: participant.cursor.y,
              }}
            >
              <View
                className="h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: participant.color }}
              >
                <Text className="text-[8px] font-bold text-white">
                  {getInitial(participant)}
                </Text>
              </View>

              {/* Field label */}
              {participant.cursor.field && (
                <View
                  className="mt-1 rounded px-1.5 py-0.5"
                  style={{ backgroundColor: participant.color }}
                >
                  <Text className="text-[10px] text-white" numberOfLines={1}>
                    {getFieldLabel(participant)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status indicator when no cursor is available */}
          {(!showCursors || !participant.cursor) && (
            <View className="flex-row items-center gap-1 px-2 py-0.5">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: participant.color }}
              />
              <Text className="text-[10px] text-muted-foreground">
                {participant.name ?? participant.userId}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
