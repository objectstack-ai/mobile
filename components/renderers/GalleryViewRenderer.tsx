import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { cn } from "~/lib/utils";
import { EmptyState } from "~/components/common/EmptyState";
import { Skeleton } from "~/components/ui/Skeleton";
import { Image as ImageIcon } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface GalleryViewRendererProps {
  /** The records to display as cards */
  records: Record<string, unknown>[];
  /** Field providing the card image URL (spec gallery `card.image`). */
  imageField?: string;
  /** Field providing the card title (default: name/title/label). */
  titleField?: string;
  /** Field providing the card subtitle. */
  subtitleField?: string;
  /** Number of columns in the grid (spec gallery `columns`, default 2). */
  numColumns?: number;
  /** Image aspect ratio (spec gallery `aspectRatio`, default 1). */
  aspectRatio?: number;
  /** Loading indicator */
  isLoading?: boolean;
  /** Card press handler */
  onCardPress?: (record: Record<string, unknown>) => void;
  /** Empty-state message */
  emptyMessage?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Resolve a display string for the first present field among candidates. */
export function resolveCardField(
  record: Record<string, unknown>,
  primary: string | undefined,
  fallbacks: string[],
): string | undefined {
  const keys = primary ? [primary, ...fallbacks] : fallbacks;
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }
  }
  return undefined;
}

/** Resolve a usable image URI from a record's image field, if any. */
export function resolveImageUri(
  record: Record<string, unknown>,
  imageField: string | undefined,
): string | undefined {
  const candidates = imageField
    ? [imageField, "image", "imageUrl", "thumbnail", "avatar", "photo"]
    : ["image", "imageUrl", "thumbnail", "avatar", "photo"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    // Some file fields store { url } or [{ url }]
    if (value && typeof value === "object") {
      const obj = Array.isArray(value) ? value[0] : value;
      const url = (obj as Record<string, unknown>)?.url;
      if (typeof url === "string" && url.length > 0) return url;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Gallery view — renders records as an image-forward card grid.
 *
 * Mirrors the spec `ListView` `gallery` visualization (`GalleryConfig`):
 * an image-led card with title/subtitle in a multi-column grid.
 */
export function GalleryViewRenderer({
  records,
  imageField,
  titleField,
  subtitleField,
  numColumns = 2,
  aspectRatio = 1,
  isLoading,
  onCardPress,
  emptyMessage = "No items to display",
}: GalleryViewRendererProps) {
  const renderCard = useCallback(
    ({ item }: { item: Record<string, unknown> }) => {
      const uri = resolveImageUri(item, imageField);
      const title =
        resolveCardField(item, titleField, ["name", "title", "label", "subject"]) ??
        "Untitled";
      const subtitle = resolveCardField(item, subtitleField, []);

      return (
        <Pressable
          className="m-1 flex-1 overflow-hidden rounded-xl border border-border bg-card active:opacity-80"
          onPress={() => onCardPress?.(item)}
        >
          <View
            className="w-full items-center justify-center bg-muted"
            style={{ aspectRatio }}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <ImageIcon size={28} color="#94a3b8" />
            )}
          </View>
          <View className="p-2">
            <Text className="text-sm font-medium text-card-foreground" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [imageField, titleField, subtitleField, aspectRatio, onCardPress],
  );

  if (isLoading && records.length === 0) {
    return (
      <View className="flex-1 flex-row flex-wrap p-2">
        {Array.from({ length: numColumns * 3 }).map((_, i) => (
          <View key={i} className="p-1" style={{ width: `${100 / numColumns}%` }}>
            <View className="overflow-hidden rounded-xl border border-border bg-card">
              <View className="w-full bg-muted" style={{ aspectRatio }} />
              <View className="p-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="mt-1.5 h-3 w-1/2 rounded-md" />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!isLoading && records.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon size={40} color="#94a3b8" />}
        title="No Items"
        description={emptyMessage}
      />
    );
  }

  return (
    <View className={cn("flex-1")}>
      <FlashList
        data={records}
        renderItem={renderCard}
        numColumns={numColumns}
        keyExtractor={(item: Record<string, unknown>, index: number) =>
          String(item.id ?? item._id ?? index)
        }
        contentContainerStyle={{ padding: 8 }}
      />
    </View>
  );
}
