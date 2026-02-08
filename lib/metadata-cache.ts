import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "objectstack-metadata" });

interface CacheEntry {
  data: unknown;
  etag?: string;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached metadata by key
 */
export function getCachedMetadata(key: string): CacheEntry | null {
  const raw = storage.getString(key);
  if (!raw) return null;

  try {
    const entry: CacheEntry = JSON.parse(raw);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Set cached metadata
 */
export function setCachedMetadata(key: string, data: unknown, etag?: string): void {
  const entry: CacheEntry = { data, etag, timestamp: Date.now() };
  storage.set(key, JSON.stringify(entry));
}

/**
 * Check if cache entry is still fresh
 */
export function isCacheFresh(key: string, ttl: number = CACHE_TTL): boolean {
  const entry = getCachedMetadata(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Get ETag for a cached key (for conditional requests)
 */
export function getCachedETag(key: string): string | undefined {
  const entry = getCachedMetadata(key);
  return entry?.etag;
}

/**
 * Clear all cached metadata
 */
export function clearMetadataCache(): void {
  storage.clearAll();
}

/**
 * Remove a specific cache entry
 */
export function removeCachedMetadata(key: string): void {
  storage.remove(key);
}
