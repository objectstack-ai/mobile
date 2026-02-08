import React from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { Bookmark, X } from "lucide-react-native";
import { cn } from "~/lib/utils";
import type { SavedView } from "~/hooks/useViewStorage";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface ViewTabsProps {
  views: SavedView[];
  activeViewId: string | null;
  onSelect: (viewId: string | null) => void;
  onDelete?: (viewId: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Horizontal chip/tab strip showing saved views above a list view.
 */
export function ViewTabs({
  views,
  activeViewId,
  onSelect,
  onDelete,
  className,
}: ViewTabsProps) {
  if (views.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className={cn("py-2", className)}
    >
      {/* "All" default tab */}
      <Pressable
        onPress={() => onSelect(null)}
        className={cn(
          "flex-row items-center rounded-full border px-3 py-1.5",
          activeViewId === null
            ? "border-primary bg-primary/10"
            : "border-border bg-card",
        )}
      >
        <Text
          className={cn(
            "text-xs font-medium",
            activeViewId === null ? "text-primary" : "text-muted-foreground",
          )}
        >
          All
        </Text>
      </Pressable>

      {/* Saved view tabs */}
      {views.map((view) => {
        const isActive = activeViewId === view.id;
        return (
          <View key={view.id} className="flex-row items-center">
            <Pressable
              onPress={() => onSelect(view.id)}
              className={cn(
                "flex-row items-center rounded-full border px-3 py-1.5",
                isActive ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <Bookmark size={12} color={isActive ? "#1e40af" : "#94a3b8"} />
              <Text
                className={cn(
                  "ml-1.5 text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
                numberOfLines={1}
              >
                {view.name}
              </Text>
              {isActive && view.visibility === "shared" && (
                <Text className="ml-1 text-xs text-muted-foreground">•</Text>
              )}
            </Pressable>
            {isActive && onDelete && (
              <Pressable onPress={() => onDelete(view.id)} className="ml-1 p-1">
                <X size={12} color="#ef4444" />
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
