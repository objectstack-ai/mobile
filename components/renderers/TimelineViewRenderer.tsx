import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Circle, CheckCircle2, AlertCircle, Clock, User, FileText } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface TimelineEntry {
  /** Unique ID */
  id: string;
  /** Entry title / headline */
  title: string;
  /** Description or body text */
  description?: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Activity type (used for icon/colour selection) */
  type?: "create" | "update" | "delete" | "comment" | "status" | "system" | string;
  /** Actor / user who performed the action */
  actor?: string;
  /** Optional record reference */
  record?: Record<string, unknown>;
}

export interface TimelineViewRendererProps {
  /** Timeline entries (sorted newest-first by default) */
  entries: TimelineEntry[];
  /** Loading */
  isLoading?: boolean;
  /** Called when an entry is pressed */
  onEntryPress?: (entry: TimelineEntry) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function EntryIcon({ type }: { type?: string }) {
  const size = 16;
  switch (type) {
    case "create":
      return <CheckCircle2 size={size} color="#10b981" />;
    case "update":
      return <FileText size={size} color="#3b82f6" />;
    case "delete":
      return <AlertCircle size={size} color="#ef4444" />;
    case "comment":
      return <FileText size={size} color="#8b5cf6" />;
    case "status":
      return <Clock size={size} color="#f59e0b" />;
    case "system":
      return <Circle size={size} color="#94a3b8" />;
    default:
      return <Circle size={size} color="#94a3b8" />;
  }
}

function EntryDotColor(type?: string): string {
  switch (type) {
    case "create": return "#10b981";
    case "update": return "#3b82f6";
    case "delete": return "#ef4444";
    case "comment": return "#8b5cf6";
    case "status": return "#f59e0b";
    default: return "#94a3b8";
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * Timeline view renderer.
 *
 * Displays a chronological list of activity entries with a vertical
 * connector line, type-specific icons, and relative timestamps.
 */
export function TimelineViewRenderer({
  entries,
  isLoading = false,
  onEntryPress,
}: TimelineViewRendererProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Clock size={48} color="#94a3b8" />
        <Text className="mt-4 text-lg font-semibold text-foreground">No Activity</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          No timeline entries found.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;

        return (
          <Pressable
            key={entry.id}
            className="flex-row active:opacity-80"
            onPress={onEntryPress ? () => onEntryPress(entry) : undefined}
          >
            {/* Timeline connector */}
            <View className="mr-3 items-center" style={{ width: 24 }}>
              {/* Dot */}
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: EntryDotColor(entry.type) + "20" }}
              >
                <EntryIcon type={entry.type} />
              </View>
              {/* Line */}
              {!isLast && (
                <View className="w-0.5 flex-1 bg-border" style={{ minHeight: 24 }} />
              )}
            </View>

            {/* Content */}
            <View className="mb-4 flex-1 pb-2">
              <Text className="text-sm font-medium text-foreground">{entry.title}</Text>
              {entry.description && (
                <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={3}>
                  {entry.description}
                </Text>
              )}
              <View className="mt-1.5 flex-row items-center gap-2">
                {entry.actor && (
                  <View className="flex-row items-center gap-1">
                    <User size={10} color="#94a3b8" />
                    <Text className="text-[10px] text-muted-foreground">{entry.actor}</Text>
                  </View>
                )}
                <Text className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(entry.timestamp)}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
