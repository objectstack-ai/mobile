/**
 * Tests for metadata-cache — MMKV-based caching layer
 */
import {
  getCachedMetadata,
  setCachedMetadata,
  isCacheFresh,
  getCachedETag,
  clearMetadataCache,
  removeCachedMetadata,
} from "~/lib/metadata-cache";

describe("metadata-cache", () => {
  beforeEach(() => {
    clearMetadataCache();
  });

  it("returns null for missing key", () => {
    expect(getCachedMetadata("missing")).toBeNull();
  });

  it("stores and retrieves metadata", () => {
    setCachedMetadata("key1", { foo: "bar" });
    const entry = getCachedMetadata("key1");
    expect(entry).not.toBeNull();
    expect(entry!.data).toEqual({ foo: "bar" });
    expect(entry!.timestamp).toBeDefined();
  });

  it("stores and retrieves etag", () => {
    setCachedMetadata("key2", { data: 1 }, "etag-123");
    const entry = getCachedMetadata("key2");
    expect(entry!.etag).toBe("etag-123");
  });

  it("getCachedETag returns undefined for missing key", () => {
    expect(getCachedETag("nope")).toBeUndefined();
  });

  it("getCachedETag returns etag for cached key", () => {
    setCachedMetadata("key3", {}, "etag-abc");
    expect(getCachedETag("key3")).toBe("etag-abc");
  });

  it("isCacheFresh returns false for missing key", () => {
    expect(isCacheFresh("nope")).toBe(false);
  });

  it("isCacheFresh returns true for fresh entry", () => {
    setCachedMetadata("fresh", { v: 1 });
    expect(isCacheFresh("fresh")).toBe(true);
  });

  it("isCacheFresh returns false for expired entry", () => {
    setCachedMetadata("expired", { v: 1 });
    // Use a TTL of 0ms to make it immediately stale
    expect(isCacheFresh("expired", 0)).toBe(false);
  });

  it("removeCachedMetadata removes a specific entry", () => {
    setCachedMetadata("toRemove", { v: 1 });
    expect(getCachedMetadata("toRemove")).not.toBeNull();
    removeCachedMetadata("toRemove");
    expect(getCachedMetadata("toRemove")).toBeNull();
  });

  it("clearMetadataCache clears all entries", () => {
    setCachedMetadata("a", { v: 1 });
    setCachedMetadata("b", { v: 2 });
    clearMetadataCache();
    expect(getCachedMetadata("a")).toBeNull();
    expect(getCachedMetadata("b")).toBeNull();
  });
});
