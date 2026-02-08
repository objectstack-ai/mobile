import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { X, Download, Share2 } from "lucide-react-native";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface GalleryImage {
  /** Server file ID (for download / share) */
  id: string;
  /** Display-ready URI (local or remote) */
  uri: string;
  /** Alt / caption text */
  label?: string;
}

export interface ImageGalleryProps {
  /** Images to display */
  images: GalleryImage[];
  /** Loading */
  isLoading?: boolean;
  /** Number of columns in the grid (default 3) */
  columns?: number;
  /** Called when user taps download */
  onDownload?: (image: GalleryImage) => void;
  /** Called when user taps share */
  onShare?: (image: GalleryImage) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Image preview grid with full-screen lightbox.
 */
export function ImageGallery({
  images,
  isLoading = false,
  columns = 3,
  onDownload,
  onShare,
}: ImageGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const gap = 4;
  const padding = 16;
  const tileSize = (screenWidth - padding * 2 - gap * (columns - 1)) / columns;

  const renderThumbnail = useCallback(
    ({ item, index }: { item: GalleryImage; index: number }) => (
      <Pressable
        onPress={() => setSelectedIndex(index)}
        style={{ width: tileSize, height: tileSize, marginRight: gap, marginBottom: gap }}
      >
        <Image
          source={{ uri: item.uri }}
          style={{ width: tileSize, height: tileSize, borderRadius: 8 }}
          resizeMode="cover"
        />
      </Pressable>
    ),
    [tileSize],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-sm text-muted-foreground">No images</Text>
      </View>
    );
  }

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <View className="flex-1">
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={renderThumbnail}
        numColumns={columns}
        contentContainerStyle={{ paddingHorizontal: padding, paddingTop: padding }}
      />

      {/* Lightbox modal */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <View className="flex-1 bg-black">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-12 pb-2">
            <Pressable onPress={() => setSelectedIndex(null)} className="rounded-full bg-white/20 p-2">
              <X size={20} color="#fff" />
            </Pressable>
            <View className="flex-row gap-3">
              {onDownload && selectedImage && (
                <Pressable
                  onPress={() => onDownload(selectedImage)}
                  className="rounded-full bg-white/20 p-2"
                >
                  <Download size={20} color="#fff" />
                </Pressable>
              )}
              {onShare && selectedImage && (
                <Pressable
                  onPress={() => onShare(selectedImage)}
                  className="rounded-full bg-white/20 p-2"
                >
                  <Share2 size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Image */}
          {selectedImage && (
            <View className="flex-1 items-center justify-center px-4">
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: screenWidth - 32, height: screenWidth - 32 }}
                resizeMode="contain"
              />
              {selectedImage.label && (
                <Text className="mt-4 text-center text-base text-white">
                  {selectedImage.label}
                </Text>
              )}
            </View>
          )}

          {/* Counter */}
          {selectedIndex !== null && (
            <Text className="pb-10 text-center text-sm text-white/70">
              {selectedIndex + 1} / {images.length}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}
