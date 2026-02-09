import React from "react";
import { View, Text } from "react-native";
import type { PresenceMember } from "~/hooks/useSubscription";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CollaborationIndicatorProps {
  /** List of presence members in the current channel */
  members: PresenceMember[];
  /** Maximum number of avatars to show before "+N" */
  maxVisible?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  online: "#22c55e",
  away: "#eab308",
  busy: "#ef4444",
  offline: "#94a3b8",
};

function getInitial(userId: string): string {
  return userId.charAt(0).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Displays a row of presence avatars indicating who is currently
 * viewing or editing the same record / channel.
 */
export function CollaborationIndicator({
  members,
  maxVisible = 5,
}: CollaborationIndicatorProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  return (
    <View className="flex-row items-center gap-1 px-4 py-2">
      <Text className="mr-1 text-xs text-muted-foreground">Viewing:</Text>
      {visible.map((member) => (
        <View
          key={member.userId}
          className="h-6 w-6 items-center justify-center rounded-full bg-primary/20"
        >
          <Text className="text-[10px] font-bold text-primary">
            {getInitial(member.userId)}
          </Text>
          <View
            className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white"
            style={{
              backgroundColor: statusColors[member.status] ?? "#94a3b8",
            }}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View className="h-6 w-6 items-center justify-center rounded-full bg-muted">
          <Text className="text-[10px] font-medium text-muted-foreground">
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}
