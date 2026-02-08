import React from "react";
import { Image, type ImageProps } from "expo-image";

/**
 * CachedImage — drop-in replacement for React Native's Image.
 *
 * Wraps expo-image for built-in disk/memory caching, progressive
 * loading with blur-hash placeholder, and lazy loading.
 */
export interface CachedImageProps extends Omit<ImageProps, "source"> {
  /** Remote or local image URI */
  uri: string;
  /** Optional blurhash string to show while loading */
  blurhash?: string;
  /** Width of the image (required for layout) */
  width?: number;
  /** Height of the image (required for layout) */
  height?: number;
}

export function CachedImage({
  uri,
  blurhash,
  width,
  height,
  style,
  ...rest
}: CachedImageProps) {
  return (
    <Image
      source={{ uri }}
      placeholder={blurhash ? { blurhash } : undefined}
      transition={200}
      cachePolicy="disk"
      contentFit="cover"
      style={[width != null && height != null ? { width, height } : undefined, style]}
      {...rest}
    />
  );
}
